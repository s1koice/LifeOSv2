create table if not exists public.nexus_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nexus_user_state enable row level security;

revoke all on table public.nexus_user_state from anon;
grant select, insert, update, delete on table public.nexus_user_state to authenticated;

drop policy if exists "nexus_state_select_own" on public.nexus_user_state;
create policy "nexus_state_select_own"
on public.nexus_user_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "nexus_state_insert_own" on public.nexus_user_state;
create policy "nexus_state_insert_own"
on public.nexus_user_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "nexus_state_update_own" on public.nexus_user_state;
create policy "nexus_state_update_own"
on public.nexus_user_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "nexus_state_delete_own" on public.nexus_user_state;
create policy "nexus_state_delete_own"
on public.nexus_user_state for delete
to authenticated
using ((select auth.uid()) = user_id);
