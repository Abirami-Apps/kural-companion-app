set lock_timeout = '10s';

-- Keep trigger helpers outside the schemas exposed by the Data API.
create schema if not exists kural_private;
revoke all on schema kural_private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 80
  )
);

create table public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  kural_number smallint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kural_number),
  constraint favourites_kural_number_range check (kural_number between 1 and 1330)
);

create index favourites_user_created_at_idx
  on public.favourites (user_id, created_at desc);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'classic',
  font_step smallint not null default 1,
  high_contrast boolean not null default false,
  reduced_motion boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_allowed check (
    theme in ('classic', 'palm', 'midnight', 'sepia')
  ),
  constraint user_preferences_font_step_range check (font_step between 0 and 3)
);

create table public.hourly_kural_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  start_hour smallint not null default 7,
  end_hour smallint not null default 22,
  language text not null default 'ta',
  selection_mode text not null default 'random',
  include_meaning boolean not null default false,
  time_zone text not null default 'Asia/Kolkata',
  last_kural_number smallint,
  updated_at timestamptz not null default now(),
  constraint hourly_kural_start_hour_range check (start_hour between 0 and 23),
  constraint hourly_kural_end_hour_range check (end_hour between 0 and 23),
  constraint hourly_kural_language_allowed check (language in ('ta', 'en')),
  constraint hourly_kural_selection_allowed check (
    selection_mode in ('random', 'sequential', 'favourites')
  ),
  constraint hourly_kural_time_zone_length check (char_length(time_zone) between 1 and 64),
  constraint hourly_kural_last_number_range check (
    last_kural_number is null or last_kural_number between 1 and 1330
  )
);

comment on table public.profiles is 'Private user profile data for Kural Companion.';
comment on table public.favourites is 'Kurals saved by each authenticated user.';
comment on table public.user_preferences is 'Cross-device appearance and accessibility preferences.';
comment on table public.hourly_kural_settings is 'Cross-device Hourly Kural schedule configuration.';

create function kural_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function kural_private.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function kural_private.set_updated_at();

create trigger hourly_kural_settings_set_updated_at
  before update on public.hourly_kural_settings
  for each row execute function kural_private.set_updated_at();

-- The trigger uses no user-controlled metadata, keeping the sign-up path small
-- and preventing malformed metadata from blocking account creation.
create function kural_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.hourly_kural_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger kural_companion_on_auth_user_created
  after insert on auth.users
  for each row execute function kural_private.handle_new_user();

-- Backfill accounts created before this migration was installed.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.hourly_kural_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.favourites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.hourly_kural_settings enable row level security;

-- New cloud projects do not auto-expose tables. Keep grants explicit so the
-- migration behaves the same on local, existing, and future projects.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.favourites from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
revoke all on table public.hourly_kural_settings from anon, authenticated;

grant select on table public.profiles to authenticated;
grant insert (user_id, display_name) on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select, delete on table public.favourites to authenticated;
grant insert (user_id, kural_number) on table public.favourites to authenticated;

grant select on table public.user_preferences to authenticated;
grant insert (user_id, theme, font_step, high_contrast, reduced_motion)
  on table public.user_preferences to authenticated;
grant update (theme, font_step, high_contrast, reduced_motion)
  on table public.user_preferences to authenticated;

grant select on table public.hourly_kural_settings to authenticated;
grant insert (
  user_id,
  enabled,
  start_hour,
  end_hour,
  language,
  selection_mode,
  include_meaning,
  time_zone,
  last_kural_number
) on table public.hourly_kural_settings to authenticated;
grant update (
  enabled,
  start_hour,
  end_hour,
  language,
  selection_mode,
  include_meaning,
  time_zone,
  last_kural_number
) on table public.hourly_kural_settings to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.favourites to service_role;
grant all on table public.user_preferences to service_role;
grant all on table public.hourly_kural_settings to service_role;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy favourites_select_own
on public.favourites for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy favourites_insert_own
on public.favourites for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy favourites_delete_own
on public.favourites for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy user_preferences_select_own
on public.user_preferences for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy user_preferences_insert_own
on public.user_preferences for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy user_preferences_update_own
on public.user_preferences for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy hourly_kural_settings_select_own
on public.hourly_kural_settings for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy hourly_kural_settings_insert_own
on public.hourly_kural_settings for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy hourly_kural_settings_update_own
on public.hourly_kural_settings for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
