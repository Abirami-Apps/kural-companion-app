set lock_timeout = '10s';

alter table kural_private.billing_checkout_sessions
  add column trial_ends_at timestamptz;

alter table kural_private.billing_checkout_sessions
  drop constraint billing_checkout_sessions_status_allowed,
  add constraint billing_checkout_sessions_status_allowed check (
    status in ('pending', 'trialing', 'active', 'grace_period', 'paused', 'expired', 'revoked')
  ),
  add constraint billing_checkout_sessions_trial_plan_match check (
    trial_ends_at is null or (plan_key = 'monthly' and checkout_kind = 'subscription')
  );

comment on column kural_private.billing_checkout_sessions.trial_ends_at is
  'End of the one-per-account introductory trial, when one was granted.';

create function public.razorpay_trial_eligible(
  p_user_id uuid,
  p_environment text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and exists (select 1 from auth.users where id = p_user_id)
    and not exists (
      select 1
      from kural_private.billing_checkout_sessions
      where user_id = p_user_id
        and environment = p_environment
        and (
          payment_id is not null
          or (
            trial_ends_at is not null
            and (
              status in ('trialing', 'active', 'grace_period', 'paused', 'expired', 'revoked')
              or created_at > now() - interval '30 minutes'
            )
          )
        )
    );
$$;

revoke all on function public.razorpay_trial_eligible(uuid, text)
  from public, anon, authenticated;

grant execute on function public.razorpay_trial_eligible(uuid, text)
  to service_role;

create or replace function kural_private.reconcile_razorpay_entitlement(
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
    and status in ('trialing', 'active', 'grace_period')
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
  p_currency text,
  p_trial_days integer
)
returns table (session_id uuid, trial_ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_session_id uuid;
  selected_trial_ends_at timestamptz;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'valid user id is required';
  end if;
  if p_trial_days < 0 or p_trial_days > 30 then
    raise exception 'trial duration is invalid';
  end if;
  if p_trial_days > 0 and (p_plan_key <> 'monthly' or p_checkout_kind <> 'subscription') then
    raise exception 'trial is available only for the monthly subscription';
  end if;
  if (
    select count(*) >= 5
    from kural_private.billing_checkout_sessions
    where user_id = p_user_id and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'too many recent checkout attempts';
  end if;

  -- Serialize trial claims for this account and environment. An abandoned
  -- checkout blocks another trial checkout briefly, while an authenticated or
  -- completed trial permanently consumes introductory eligibility.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_environment, 0)
  );
  if p_trial_days > 0 and not exists (
    select 1
    from kural_private.billing_checkout_sessions as checkout
    where checkout.user_id = p_user_id
      and checkout.environment = p_environment
      and (
        checkout.payment_id is not null
        or (
          checkout.trial_ends_at is not null
          and (
            checkout.status in ('trialing', 'active', 'grace_period', 'paused', 'expired', 'revoked')
            or checkout.created_at > now() - interval '30 minutes'
          )
        )
      )
  ) then
    selected_trial_ends_at := now() + pg_catalog.make_interval(days => p_trial_days);
  end if;

  insert into kural_private.billing_checkout_sessions (
    user_id,
    plan_key,
    checkout_kind,
    environment,
    amount_subunits,
    currency,
    trial_ends_at
  ) values (
    p_user_id,
    p_plan_key,
    p_checkout_kind,
    p_environment,
    p_amount_subunits,
    p_currency,
    selected_trial_ends_at
  ) returning id into created_session_id;

  return query select created_session_id, selected_trial_ends_at;
end;
$$;

revoke all on function public.create_razorpay_checkout_session(
  uuid, text, text, text, integer, text, integer
) from public, anon, authenticated;

grant execute on function public.create_razorpay_checkout_session(
  uuid, text, text, text, integer, text, integer
) to service_role;

create or replace function public.get_razorpay_recurring_subscription(p_user_id uuid)
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
    and status in ('trialing', 'active', 'grace_period')
    and not cancel_at_period_end
    and expires_at > now()
  order by updated_at desc
  limit 1;
$$;

revoke all on function public.get_razorpay_recurring_subscription(uuid)
  from public, anon, authenticated;

grant execute on function public.get_razorpay_recurring_subscription(uuid)
  to service_role;
