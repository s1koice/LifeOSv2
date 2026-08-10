create table if not exists public.nexus_pin_state (
  owner text primary key check (owner = 'primary'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nexus_pin_state enable row level security;

revoke all on table public.nexus_pin_state from anon;
revoke all on table public.nexus_pin_state from authenticated;

-- No browser policy is intentionally created. Only the server-side Supabase
-- secret key can read or write this personal singleton record.
