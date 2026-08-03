begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table(
  'public',
  'user_entitlements',
  'user entitlements table exists'
);
select col_is_pk(
  'public',
  'user_entitlements',
  array['user_id', 'entitlement_key'],
  'entitlements use an account and capability primary key'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_entitlements'::regclass),
  'user entitlements has RLS enabled'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public' and tablename = 'user_entitlements'
  ),
  1,
  'user entitlements has only the read-own policy'
);
select has_function(
  'public',
  'has_active_entitlement',
  array['text'],
  'active-entitlement predicate exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.has_active_entitlement(text)',
    'execute'
  ),
  'authenticated users can evaluate their own access'
);

select ok(
  not has_table_privilege('anon', 'public.user_entitlements', 'select'),
  'anonymous users cannot read entitlements'
);
select ok(
  has_table_privilege('authenticated', 'public.user_entitlements', 'select'),
  'authenticated users can read entitlement status'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_entitlements', 'insert'),
  'authenticated users cannot create entitlements'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_entitlements', 'update'),
  'authenticated users cannot activate entitlements'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_entitlements', 'delete'),
  'authenticated users cannot delete entitlements'
);

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
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'premium@example.com',
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
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'free@example.com',
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
  $$select count(*)::bigint from public.user_entitlements where user_id in (
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444'
  )$$,
  array[2::bigint],
  'new-user trigger creates inactive premium records'
);
select results_eq(
  $$select count(*)::bigint from public.user_entitlements
    where status = 'inactive' and entitlement_key = 'premium'$$,
  array[2::bigint],
  'new entitlement records fail closed'
);

update public.user_entitlements
set
  status = 'active',
  plan_key = 'yearly',
  source = 'stripe',
  starts_at = now() - interval '1 day',
  expires_at = now() + interval '1 year'
where user_id = '33333333-3333-4333-8333-333333333333';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

select results_eq(
  $$select count(*)::bigint from public.user_entitlements$$,
  array[1::bigint],
  'a user reads only their own entitlement'
);
select results_eq(
  $$select status from public.user_entitlements where entitlement_key = 'premium'$$,
  array['active'::text],
  'the owner can read their resolved status'
);
select ok(
  public.has_active_entitlement('premium'),
  'the server predicate accepts a current active entitlement'
);
select ok(
  not public.has_active_entitlement('unknown'),
  'the server predicate rejects an unknown entitlement'
);
select throws_like(
  $$update public.user_entitlements set status = 'active'$$,
  '%permission denied%',
  'the browser role cannot modify entitlement status'
);

reset role;
update public.user_entitlements
set
  status = 'active',
  starts_at = now() - interval '2 years',
  expires_at = now() - interval '1 year'
where user_id = '33333333-3333-4333-8333-333333333333';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

select ok(
  not public.has_active_entitlement('premium'),
  'an expired record does not grant access'
);

reset role;
update public.user_entitlements
set
  status = 'trialing',
  starts_at = now() + interval '1 day',
  expires_at = now() + interval '8 days'
where user_id = '33333333-3333-4333-8333-333333333333';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}';

select ok(
  not public.has_active_entitlement('premium'),
  'a future trial does not grant access early'
);

select * from finish();
rollback;
