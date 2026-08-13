-- ShipRank migration 00007 — subscriptions (Stripe-backed paywall)
-- Unlike every other table in this schema, subscriptions is NOT publicly
-- readable — it carries billing email + Stripe customer id + the CLI API
-- key. Only the service role (server-side API routes) ever touches it.

create type subscription_plan as enum ('free', 'pro', 'monitor');
create type subscription_status as enum ('active', 'canceled', 'expired');

create table subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_email          text not null,
  stripe_customer_id  text,
  plan                subscription_plan not null default 'free',
  api_key             text unique,           -- shiprank_live_<48 hex> — CLI/API auth
  status              subscription_status not null default 'active',
  created_at          timestamptz not null default now(),
  expires_at          timestamptz
);

create index idx_subscriptions_api_key on subscriptions(api_key);
create index idx_subscriptions_email on subscriptions(user_email);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);

alter table subscriptions enable row level security;

-- Service-role only — no public read policy. Plan lookups happen server-side
-- via /api/account, /api/scan/[id], etc., always with the service-role key.
create policy "subscriptions_service_only" on subscriptions
  for all using (auth.role() = 'service_role');

comment on table subscriptions is
  'Stripe-backed plan state. api_key is the CLI/MCP bearer credential (shiprank_live_...), generated on checkout.session.completed.';
