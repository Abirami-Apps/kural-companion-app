set lock_timeout = '10s';

-- Store only the minimum delivery metadata needed for idempotency and audit.
-- Raw webhook bodies, payment details and provider credentials never enter the
-- browser-readable public schema.
create table kural_private.billing_webhook_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  environment text not null,
  event_timestamp timestamptz not null,
  payload_sha256 text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id),
  constraint billing_webhook_events_provider_allowed check (
    provider in ('revenuecat')
  ),
  constraint billing_webhook_events_event_id_length check (
    char_length(event_id) between 1 and 160
  ),
  constraint billing_webhook_events_event_type_length check (
    char_length(event_type) between 1 and 80
  ),
  constraint billing_webhook_events_environment_allowed check (
    environment in ('SANDBOX', 'PRODUCTION')
  ),
  constraint billing_webhook_events_payload_digest check (
    payload_sha256 ~ '^[0-9a-f]{64}$'
  )
);

comment on table kural_private.billing_webhook_events is
  'Minimal, private idempotency ledger for authenticated billing webhook deliveries.';

revoke all on table kural_private.billing_webhook_events from public, anon, authenticated;

-- Both the signed webhook and the authenticated self-refresh Edge Function use
-- this single trusted write path. A non-null event ID is applied at most once.
create function public.apply_revenuecat_entitlement_sync(
  p_event_id text,
  p_user_id uuid,
  p_event_type text,
  p_event_timestamp timestamptz,
  p_environment text,
  p_status text,
  p_plan_key text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_cancel_at_period_end boolean,
  p_payload_sha256 text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;
  if p_environment not in ('SANDBOX', 'PRODUCTION') then
    raise exception 'unsupported billing environment';
  end if;
  if p_status not in (
    'inactive', 'trialing', 'active', 'grace_period', 'paused', 'expired', 'revoked'
  ) then
    raise exception 'unsupported entitlement status';
  end if;
  if p_event_id is not null then
    insert into kural_private.billing_webhook_events (
      provider,
      event_id,
      event_type,
      user_id,
      environment,
      event_timestamp,
      payload_sha256
    )
    values (
      'revenuecat',
      p_event_id,
      p_event_type,
      p_user_id,
      p_environment,
      p_event_timestamp,
      p_payload_sha256
    )
    on conflict (provider, event_id) do nothing;

    if not found then
      return false;
    end if;
  end if;

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
  )
  values (
    p_user_id,
    'premium',
    p_status,
    p_plan_key,
    'revenuecat',
    p_starts_at,
    p_expires_at,
    p_cancel_at_period_end,
    now()
  )
  on conflict (user_id, entitlement_key) do update
  set
    status = excluded.status,
    plan_key = excluded.plan_key,
    source = excluded.source,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.apply_revenuecat_entitlement_sync(
  text, uuid, text, timestamptz, text, text, text, timestamptz, timestamptz, boolean, text
) from public, anon, authenticated;
grant execute on function public.apply_revenuecat_entitlement_sync(
  text, uuid, text, timestamptz, text, text, text, timestamptz, timestamptz, boolean, text
) to service_role;
