-- CARVERSE: tables for the "Request a Feature" wall and per-user garages.
-- Run in Supabase Dashboard → SQL Editor (the MCP connection is read-only).
-- Safe to re-run: every statement is idempotent.

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Driver',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

alter table public.feature_requests enable row level security;
alter table public.favorites enable row level security;

-- feature_requests: everyone reads (universal wall); users manage only their own rows.
drop policy if exists feature_requests_select_all on public.feature_requests;
create policy feature_requests_select_all on public.feature_requests
  for select using (true);

drop policy if exists feature_requests_insert_own on public.feature_requests;
create policy feature_requests_insert_own on public.feature_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists feature_requests_delete_own on public.feature_requests;
create policy feature_requests_delete_own on public.feature_requests
  for delete using (auth.uid() = user_id);

-- favorites: strictly per-user private garages.
drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete using (auth.uid() = user_id);

create index if not exists feature_requests_created_idx on public.feature_requests (created_at desc);
