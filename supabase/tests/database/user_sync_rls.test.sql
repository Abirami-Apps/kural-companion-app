begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'favourites', 'favourites table exists');
select has_table('public', 'user_preferences', 'user_preferences table exists');
select has_table('public', 'hourly_kural_settings', 'hourly_kural_settings table exists');

select col_is_pk('public', 'profiles', 'user_id', 'profiles.user_id is the primary key');
select col_is_pk('public', 'user_preferences', 'user_id', 'preferences.user_id is the primary key');
select col_is_pk('public', 'hourly_kural_settings', 'user_id', 'hourly settings user_id is the primary key');
select has_pk('public', 'favourites', 'favourites has a composite primary key');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.favourites'::regclass),
  'favourites has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass),
  'user_preferences has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.hourly_kural_settings'::regclass),
  'hourly_kural_settings has RLS enabled'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  3,
  'profiles has select, insert, and update policies'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'favourites'),
  3,
  'favourites has select, insert, and delete policies'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'user_preferences'),
  3,
  'user_preferences has select, insert, and update policies'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'hourly_kural_settings'),
  3,
  'hourly_kural_settings has select, insert, and update policies'
);

select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon cannot read profiles');
select ok(not has_table_privilege('anon', 'public.favourites', 'select'), 'anon cannot read favourites');
select ok(not has_table_privilege('anon', 'public.user_preferences', 'select'), 'anon cannot read preferences');
select ok(not has_table_privilege('anon', 'public.hourly_kural_settings', 'select'), 'anon cannot read hourly settings');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'one@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'two@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

select results_eq(
  $$select count(*)::bigint from public.profiles where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )$$,
  array[2::bigint],
  'new-user trigger creates both profiles'
);
select results_eq(
  $$select count(*)::bigint from public.user_preferences where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )$$,
  array[2::bigint],
  'new-user trigger creates both preference rows'
);
select results_eq(
  $$select count(*)::bigint from public.hourly_kural_settings where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )$$,
  array[2::bigint],
  'new-user trigger creates both hourly-setting rows'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[1::bigint],
  'user one can read only their own profile'
);
select results_eq(
  $$select count(*)::bigint from public.profiles
    where user_id = '22222222-2222-4222-8222-222222222222'$$,
  array[0::bigint],
  'user one cannot read user two profile'
);
select lives_ok(
  $$insert into public.favourites (user_id, kural_number)
    values ('11111111-1111-4111-8111-111111111111', 770)$$,
  'user one can save their own favourite'
);
select throws_like(
  $$insert into public.favourites (user_id, kural_number)
    values ('22222222-2222-4222-8222-222222222222', 770)$$,
  '%row-level security%',
  'user one cannot save a favourite for user two'
);
select results_eq(
  $$select count(*)::bigint from public.favourites$$,
  array[1::bigint],
  'user one sees only their own favourites'
);
select throws_like(
  $$insert into public.favourites (user_id, kural_number)
    values ('11111111-1111-4111-8111-111111111111', 1331)$$,
  '%favourites_kural_number_range%',
  'out-of-range Kural numbers are rejected'
);

select * from finish();
rollback;
