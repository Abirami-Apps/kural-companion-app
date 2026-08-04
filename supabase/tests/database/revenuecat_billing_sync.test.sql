begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

select has_table(
  'kural_private',
  'billing_webhook_events',
  'private webhook idempotency table exists'
);
select ok(
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'billing_webhook_events'
  ),
  'webhook ledger is not in the exposed public schema'
);
select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'apply_revenuecat_entitlement_sync'
  ),
  'trusted RevenueCat sync function exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_revenuecat_entitlement_sync(text,uuid,text,timestamp with time zone,text,text,text,timestamp with time zone,timestamp with time zone,boolean,text)',
    'execute'
  ),
  'browser users cannot call the trusted sync function'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.apply_revenuecat_entitlement_sync(text,uuid,text,timestamp with time zone,text,text,text,timestamp with time zone,timestamp with time zone,boolean,text)',
    'execute'
  ),
  'service role can call the trusted sync function'
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
values (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'billing@example.com',
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

set local role service_role;

select ok(
  public.apply_revenuecat_entitlement_sync(
    'evt_initial',
    '55555555-5555-4555-8555-555555555555',
    'INITIAL_PURCHASE',
    now(),
    'SANDBOX',
    'active',
    'monthly',
    now() - interval '1 minute',
    now() + interval '1 month',
    false,
    repeat('a', 64)
  ),
  'first signed event is applied'
);
select results_eq(
  $$select status, plan_key, source from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  $$values ('active'::text, 'monthly'::text, 'revenuecat'::text)$$,
  'trusted sync writes a RevenueCat entitlement'
);
select is(
  public.apply_revenuecat_entitlement_sync(
    'evt_initial',
    '55555555-5555-4555-8555-555555555555',
    'EXPIRATION',
    now(),
    'SANDBOX',
    'expired',
    'monthly',
    now() - interval '2 months',
    now() - interval '1 month',
    false,
    repeat('b', 64)
  ),
  false,
  'a retried event ID is ignored'
);
select results_eq(
  $$select status from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  array['active'::text],
  'a duplicate event cannot overwrite access state'
);

reset role;

select results_eq(
  $$select count(*)::bigint from kural_private.billing_webhook_events
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  array[1::bigint],
  'only one idempotency record exists for a retried event'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}';

select ok(
  public.has_active_entitlement('premium'),
  'the account receives access after trusted synchronization'
);

select * from finish();
rollback;
