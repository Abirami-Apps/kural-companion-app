set lock_timeout = '10s';

-- This table is the browser-safe result of billing decisions made by trusted
-- server processes. Provider customer IDs, receipts, webhook payloads, and
-- secrets must never be stored here or exposed through the Data API.
create table public.user_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_key text not null default 'premium',
  status text not null default 'inactive',
  plan_key text,
  source text not null default 'manual',
  starts_at timestamptz,
  expires_at timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_key),
  constraint user_entitlements_key_format check (
    entitlement_key ~ '^[a-z][a-z0-9_]{0,39}$'
  ),
  constraint user_entitlements_status_allowed check (
    status in (
      'inactive',
      'trialing',
      'active',
      'grace_period',
      'paused',
      'expired',
      'revoked'
    )
  ),
  constraint user_entitlements_plan_key_length check (
    plan_key is null or char_length(plan_key) between 1 and 80
  ),
  constraint user_entitlements_source_length check (
    char_length(source) between 1 and 40
  ),
  constraint user_entitlements_period_order check (
    starts_at is null or expires_at is null or starts_at < expires_at
  )
);

comment on table public.user_entitlements is
  'Server-owned access state derived from trusted billing or promotional sources.';
comment on column public.user_entitlements.entitlement_key is
  'Stable product capability such as premium; not a payment provider product ID.';
comment on column public.user_entitlements.source is
  'Trusted writer that resolved access, such as stripe, app_store, play_store, revenuecat, promotional, or manual.';

create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function kural_private.set_updated_at();

-- Keep account provisioning atomic for both new and existing installations.
create or replace function kural_private.handle_new_user()
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

  insert into public.user_entitlements (user_id, entitlement_key)
  values (new.id, 'premium')
  on conflict (user_id, entitlement_key) do nothing;

  return new;
end;
$$;

insert into public.user_entitlements (user_id, entitlement_key)
select id, 'premium' from auth.users
on conflict (user_id, entitlement_key) do nothing;

alter table public.user_entitlements enable row level security;

-- Authenticated clients can inspect only their own resolved access. They can
-- never create, change, or delete entitlement rows.
revoke all on table public.user_entitlements from anon, authenticated;
grant select on table public.user_entitlements to authenticated;
grant all on table public.user_entitlements to service_role;

create policy user_entitlements_select_own
on public.user_entitlements for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- A shared server-side predicate keeps future RLS policies and Edge Functions
-- aligned with the browser's definition of active access.
create function public.has_active_entitlement(
  requested_entitlement text default 'premium'
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements
    where user_id = (select auth.uid())
      and entitlement_key = requested_entitlement
      and status in ('trialing', 'active', 'grace_period')
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.has_active_entitlement(text) from public, anon;
grant execute on function public.has_active_entitlement(text) to authenticated;
