begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table(
  'kural_private',
  'billing_checkout_sessions',
  'private Razorpay checkout mapping table exists'
);
select has_table(
  'kural_private',
  'billing_webhook_events',
  'private webhook idempotency table exists'
);
select ok(
  not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'billing_checkout_sessions'
  ),
  'checkout mapping is not exposed in the public schema'
);
select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'apply_razorpay_webhook_state'
  ),
  'trusted Razorpay webhook function exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_razorpay_checkout_session(uuid,text,text,text,integer,text)',
    'execute'
  ),
  'browser users cannot create server billing sessions directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.create_razorpay_checkout_session(uuid,text,text,text,integer,text)',
    'execute'
  ),
  'service role can create server billing sessions'
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

select results_eq(
  $$select status from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  array['inactive'::text],
  'new accounts begin without paid access'
);

set local role service_role;

create temporary table test_checkout as
select public.create_razorpay_checkout_session(
  '55555555-5555-4555-8555-555555555555',
  'monthly',
  'subscription',
  'TEST',
  9900,
  'INR'
) as id;

reset role;

select results_eq(
  $$select status, provider_id from kural_private.billing_checkout_sessions
    where id = (select id from test_checkout)$$,
  $$values ('pending'::text, null::text)$$,
  'new checkout sessions are pending and have no provider ID'
);

set local role service_role;

select lives_ok(
  $$select public.attach_razorpay_provider_id(
    (select id from test_checkout),
    '55555555-5555-4555-8555-555555555555',
    'sub_test123'
  )$$,
  'the service attaches the server-created provider ID'
);

select ok(
  public.apply_razorpay_checkout_state(
    (select id from test_checkout),
    '55555555-5555-4555-8555-555555555555',
    'active',
    'pay_test123',
    now() - interval '1 minute',
    now() + interval '1 month',
    false,
    now()
  ),
  'verified checkout state is applied'
);

select results_eq(
  $$select status, plan_key, source from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  $$values ('active'::text, 'monthly'::text, 'razorpay'::text)$$,
  'verified checkout grants the Razorpay entitlement'
);

select ok(
  public.apply_razorpay_webhook_state(
    'evt_charge',
    'subscription.charged',
    now() + interval '1 second',
    'TEST',
    repeat('a', 64),
    'sub_test123',
    'active',
    'pay_test456',
    now(),
    now() + interval '1 month',
    false
  ),
  'first signed webhook event is applied'
);

select is(
  public.apply_razorpay_webhook_state(
    'evt_charge',
    'subscription.cancelled',
    now() + interval '2 seconds',
    'TEST',
    repeat('b', 64),
    'sub_test123',
    'expired',
    null,
    null,
    now(),
    false
  ),
  false,
  'a retried event ID is ignored'
);

select results_eq(
  $$select status from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  array['active'::text],
  'a duplicate webhook cannot overwrite access state'
);

select ok(
  public.apply_razorpay_webhook_state(
    'evt_cancelled',
    'refund.processed',
    now() + interval '3 seconds',
    'TEST',
    repeat('c', 64),
    'order_invoice123',
    'revoked',
    'pay_test456',
    null,
    now(),
    false
  ),
  'a full refund resolves the subscription through its payment ID'
);

select results_eq(
  $$select status, plan_key, source from public.user_entitlements
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  $$values ('inactive'::text, null::text, 'razorpay'::text)$$,
  'refunded billing state removes premium access'
);

reset role;

select results_eq(
  $$select count(*)::bigint from kural_private.billing_webhook_events
    where user_id = '55555555-5555-4555-8555-555555555555'$$,
  array[2::bigint],
  'only unique webhook deliveries are recorded'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}';

select ok(
  not public.has_active_entitlement('premium'),
  'the account fails closed after its paid period ends'
);

select * from finish();
rollback;
