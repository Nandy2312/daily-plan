-- Daily Plan: one row per user holding their whole plan as JSON.
-- Run once in Supabase → SQL Editor.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- each person can only see and change their own row
drop policy if exists "own row: read"   on public.user_state;
drop policy if exists "own row: insert" on public.user_state;
drop policy if exists "own row: update" on public.user_state;
drop policy if exists "own row: delete" on public.user_state;

create policy "own row: read"   on public.user_state for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.user_state for delete using (auth.uid() = user_id);
