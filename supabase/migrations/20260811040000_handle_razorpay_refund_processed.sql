set lock_timeout = '10s';

-- Razorpay's final successful refund webhook is refund.processed. Record a
-- payment as refunded from the server-derived revoked state so this remains
-- correct if Razorpay adds another terminal refund event later.
create or replace function public.apply_razorpay_webhook_state(
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
      case when p_status = 'revoked' then 'refunded' else 'captured' end
    )
    on conflict (payment_id) do update set
      session_id = excluded.session_id,
      status = excluded.status;
  end if;

  perform kural_private.reconcile_razorpay_entitlement(matched_user_id, p_environment);
  return true;
end;
$$;

revoke all on function public.apply_razorpay_webhook_state(
  text, text, timestamptz, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) from public, anon, authenticated;

grant execute on function public.apply_razorpay_webhook_state(
  text, text, timestamptz, text, text, text, text, text,
  timestamptz, timestamptz, boolean
) to service_role;
