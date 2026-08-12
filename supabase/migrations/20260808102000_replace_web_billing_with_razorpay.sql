set lock_timeout = '10s';

-- The previous web processor declined this product. Its sandbox records must
-- not continue granting access after the provider is removed.
update public.user_entitlements
set
  status = 'inactive',
  plan_key = null,
  source = 'manual',
  starts_at = null,
  expires_at = null,
  cancel_at_period_end = false,
  updated_at = now()
where source = 'revenuecat';

drop function if exists public.apply_revenuecat_entitlement_sync(
  text, uuid, text, timestamptz, text, text, text, timestamptz, timestamptz, boolean, text
);

delete from kural_private.billing_webhook_events;
alter table kural_private.billing_webhook_events
  drop constraint billing_webhook_events_provider_allowed,
  drop constraint billing_webhook_events_environment_allowed;
alter table kural_private.billing_webhook_events
  add constraint billing_webhook_events_provider_allowed check (provider = 'razorpay'),
  add constraint billing_webhook_events_environment_allowed check (
    environment in ('TEST', 'LIVE')
  );

create table kural_private.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_key text not null,
  checkout_kind text not null,
  provider_id text unique,
  environment text not null,
  amount_subunits integer not null,
  currency text not null,
  status text not null default 'pending',
  payment_id text,
  starts_at timestamptz,
  expires_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_checkout_sessions_plan_allowed check (
    plan_key in ('monthly', 'yearly', 'lifetime')
  ),
  constraint billing_checkout_sessions_kind_allowed check (
    checkout_kind in ('order', 'subscription')
  ),
  constraint billing_checkout_sessions_plan_kind_match check (
    (plan_key = 'lifetime' and checkout_kind = 'order') or
    (plan_key in ('monthly', 'yearly') and checkout_kind = 'subscription')
  ),
  constraint billing_checkout_sessions_provider_id check (
    provider_id is null or provider_id ~ '^(order|sub)_[A-Za-z0-9]+$'
  ),
  constraint billing_checkout_sessions_environment_allowed check (
    environment in ('TEST', 'LIVE')
  ),
  constraint billing_checkout_sessions_amount_positive check (amount_subunits > 0),
  constraint billing_checkout_sessions_currency check (currency = 'INR'),
  constraint billing_checkout_sessions_status_allowed check (
    status in ('pending', 'active', 'grace_period', 'paused', 'expired', 'revoked')
  ),
  constraint billing_checkout_sessions_period_order check (
    starts_at is null or expires_at is null or starts_at <= expires_at
  )
);

create index billing_checkout_sessions_user_idx
  on kural_private.billing_checkout_sessions (user_id, environment, updated_at desc);

comment on table kural_private.billing_checkout_sessions is
  'Private server-owned mapping between Kural Companion accounts and Razorpay orders or subscriptions.';

revoke all on table kural_private.billing_checkout_sessions
  from public, anon, authenticated;

create table kural_private.billing_payments (
  payment_id text primary key,
  session_id uuid not null references kural_private.billing_checkout_sessions (id)
    on delete cascade,
  status text not null default 'captured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_payments_id_format check (
    payment_id ~ '^pay_[A-Za-z0-9]+$'
  ),
  constraint billing_payments_status_allowed check (
    status in ('captured', 'refunded')
  )
);

create index billing_payments_session_idx
  on kural_private.billing_payments (session_id, updated_at desc);

comment on table kural_private.billing_payments is
  'Minimal private payment-to-checkout mapping used to resolve signed refund events.';

revoke all on table kural_private.billing_payments
  from public, anon, authenticated;

create trigger billing_payments_set_updated_at
  before update on kural_private.billing_payments
  for each row execute function kural_private.set_updated_at();

create trigger billing_checkout_sessions_set_updated_at
  before update on kural_private.billing_checkout_sessions
  for each row execute function kural_private.set_updated_at();

create function kural_private.reconcile_razorpay_entitlement(
  p_user_id uuid,
  p_environment text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_session kural_private.billing_checkout_sessions%rowtype;
begin
  select * into selected_session
  from kural_private.billing_checkout_sessions
  where user_id = p_user_id
    and environment = p_environment
    and status in ('active', 'grace_period')
    and (starts_at is null or starts_at <= now())
    and (
      (plan_key = 'lifetime' and expires_at is null) or
      (plan_key <> 'lifetime' and expires_at > now())
    )
  order by
    case when plan_key = 'lifetime' then 0 else 1 end,
    expires_at desc nulls first,
    updated_at desc
  limit 1;

  if found then
    insert into public.user_entitlements (
      user_id,
      entitlement_key,
      status,
      plan_key,
      source,
      starts_at,
      expires_at,
      cancel_at_period_end,
      updated_at
    ) values (
      p_user_id,
      'premium',
      selected_session.status,
      selected_session.plan_key,
      'razorpay',
      selected_session.starts_at,
      selected_session.expires_at,
      selected_session.cancel_at_period_end,
      now()
    )
    on conflict (user_id, entitlement_key) do update set
      status = excluded.status,
      plan_key = excluded.plan_key,
      source = excluded.source,
      starts_at = excluded.starts_at,
      expires_at = excluded.expires_at,
      cancel_at_period_end = excluded.cancel_at_period_end,
      updated_at = now();
  else
    update public.user_entitlements
    set
      status = 'inactive',
      plan_key = null,
      source = 'razorpay',
      starts_at = null,
      expires_at = null,
      cancel_at_period_end = false,
      updated_at = now()
    where user_id = p_user_id
      and entitlement_key = 'premium'
      and source in ('razorpay', 'revenuecat');
  end if;
end;
$$;

revoke all on function kural_private.reconcile_razorpay_entitlement(uuid, text)
  from public, anon, authenticated;

create function public.create_razorpay_checkout_session(
  p_user_id uuid,
  p_plan_key text,
  p_checkout_kind text,
  p_environment text,
  p_amount_subunits integer,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'valid user id is required';
  end if;
  if (
    select count(*) >= 5
    from kural_private.billing_checkout_sessions
    where user_id = p_user_id and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'too many recent checkout attempts';
  end if;

  insert into kural_private.billing_checkout_sessions (
    user_id, plan_key, checkout_kind, environment, amount_subunits, currency
  ) values (
    p_user_id, p_plan_key, p_checkout_kind, p_environment, p_amount_subunits, p_currency
  ) returning id into session_id;
  return session_id;
end;
$$;

create function public.attach_razorpay_provider_id(
  p_session_id uuid,
  p_user_id uuid,
  p_provider_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update kural_private.billing_checkout_sessions
  set provider_id = p_provider_id
  where id = p_session_id and user_id = p_user_id and provider_id is null;
  if not found then raise exception 'checkout session was not attachable'; end if;
end;
$$;

create function public.get_razorpay_checkout_session(
  p_session_id uuid,
  p_user_id uuid
)
returns table (
  session_id uuid,
  plan_key text,
  checkout_kind text,
  provider_id text,
  environment text,
  amount_subunits integer,
  currency text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    id,
    billing_checkout_sessions.plan_key,
    billing_checkout_sessions.checkout_kind,
    billing_checkout_sessions.provider_id,
    billing_checkout_sessions.environment,
    billing_checkout_sessions.amount_subunits,
    billing_checkout_sessions.currency
  from kural_private.billing_checkout_sessions
  where id = p_session_id
    and user_id = p_user_id
    and provider_id is not null
  limit 1;
$$;

create function public.apply_razorpay_checkout_state(
  p_session_id uuid,
  p_user_id uuid,
  p_status text,
  p_payment_id text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_cancel_at_period_end boolean,
  p_event_timestamp timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_environment text;
begin
  update kural_private.billing_checkout_sessions
  set
    status = p_status,
    payment_id = coalesce(p_payment_id, payment_id),
    starts_at = p_starts_at,
    expires_at = p_expires_at,
    cancel_at_period_end = p_cancel_at_period_end,
    provider_event_at = p_event_timestamp
  where id = p_session_id
    and user_id = p_user_id
    and provider_id is not null
    and (provider_event_at is null or provider_event_at <= p_event_timestamp)
  returning environment into session_environment;
  if not found then return false; end if;

  if p_payment_id is not null then
    insert into kural_private.billing_payments (payment_id, session_id, status)
    values (p_payment_id, p_session_id, 'captured')
    on conflict (payment_id) do update set
      session_id = excluded.session_id,
      status = 'captured';
  end if;
  perform kural_private.reconcile_razorpay_entitlement(p_user_id, session_environment);
  return true;
end;
$$;

create function public.apply_razorpay_webhook_state(
  p_event_id text,
  p_event_type text,
  p_event_timestamp timestamptz,
  p_environment text,
  p_payload_sha256 text,
  p_provider_id text,
  p_status text,
  p_payment_id text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_cancel_at_period_end boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
  matched_session_id uuid;
begin
  select sessions.user_id, sessions.id
  into matched_user_id, matched_session_id
  from kural_private.billing_checkout_sessions as sessions
  left join kural_private.billing_payments as payments
    on payments.session_id = sessions.id and payments.payment_id = p_payment_id
  where sessions.environment = p_environment
    and (sessions.provider_id = p_provider_id or payments.payment_id is not null)
  for update of sessions;
  if not found then return false; end if;

  insert into kural_private.billing_webhook_events (
    provider, event_id, event_type, user_id, environment, event_timestamp, payload_sha256
  ) values (
    'razorpay', p_event_id, p_event_type, matched_user_id,
    p_environment, p_event_timestamp, p_payload_sha256
  ) on conflict (provider, event_id) do nothing;
  if not found then return false; end if;

  update kural_private.billing_checkout_sessions
  set
    status = p_status,
    payment_id = coalesce(p_payment_id, payment_id),
    starts_at = coalesce(p_starts_at, starts_at),
    expires_at = p_expires_at,
    cancel_at_period_end = p_cancel_at_period_end,
    provider_event_at = p_event_timestamp
  where id = matched_session_id
    and (provider_event_at is null or provider_event_at <= p_event_timestamp);

  if p_payment_id is not null then
    insert into kural_private.billing_payments (payment_id, session_id, status)
    values (
      p_payment_id,
      matched_session_id,
      case when p_event_type = 'payment.refunded' then 'refunded' else 'captured' end
    )
    on conflict (payment_id) do update set
      session_id = excluded.session_id,
      status = excluded.status;
  end if;

  perform kural_private.reconcile_razorpay_entitlement(matched_user_id, p_environment);
  return true;
end;
$$;

create function public.get_razorpay_recurring_subscription(p_user_id uuid)
returns table (session_id uuid, provider_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, billing_checkout_sessions.provider_id
  from kural_private.billing_checkout_sessions
  where user_id = p_user_id
    and checkout_kind = 'subscription'
    and provider_id is not null
    and status in ('active', 'grace_period')
    and not cancel_at_period_end
    and expires_at > now()
  order by updated_at desc
  limit 1;
$$;

revoke all on function public.create_razorpay_checkout_session(
  uuid, text, text, text, integer, text
) from public, anon, authenticated;
revoke all on function public.attach_razorpay_provider_id(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_razorpay_checkout_session(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.apply_razorpay_checkout_state(
  uuid, uuid, text, text, timestamptz, timestamptz, boolean, timestamptz
) from public, anon, authenticated;
revoke all on function public.apply_razorpay_webhook_state(
  text, text, timestamptz, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) from public, anon, authenticated;
revoke all on function public.get_razorpay_recurring_subscription(uuid)
  from public, anon, authenticated;

grant execute on function public.create_razorpay_checkout_session(
  uuid, text, text, text, integer, text
) to service_role;
grant execute on function public.attach_razorpay_provider_id(uuid, uuid, text)
  to service_role;
grant execute on function public.get_razorpay_checkout_session(uuid, uuid)
  to service_role;
grant execute on function public.apply_razorpay_checkout_state(
  uuid, uuid, text, text, timestamptz, timestamptz, boolean, timestamptz
) to service_role;
grant execute on function public.apply_razorpay_webhook_state(
  text, text, timestamptz, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) to service_role;
grant execute on function public.get_razorpay_recurring_subscription(uuid)
  to service_role;
