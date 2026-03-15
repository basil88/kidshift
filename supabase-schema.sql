-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Store Google OAuth tokens for each user
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  expires_at bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pairing system
create type pair_status as enum ('PENDING', 'ACTIVE', 'DISSOLVED');

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status pair_status default 'PENDING',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- User profiles + pair reference
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  image text,
  pair_id uuid references public.pairs(id),
  timezone text default 'America/New_York',
  created_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, image)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS policies
alter table public.profiles enable row level security;
alter table public.google_tokens enable row level security;
alter table public.pairs enable row level security;

-- Profiles: users can read their own and their partner's
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can read partner profile" on public.profiles
  for select using (
    pair_id is not null and pair_id in (
      select pair_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Google tokens: only own tokens
create policy "Users can manage own tokens" on public.google_tokens
  for all using (auth.uid() = user_id);

-- Pairs: users can read pairs they belong to
create policy "Users can read own pairs" on public.pairs
  for select using (
    id in (select pair_id from public.profiles where id = auth.uid())
  );

create policy "Users can read pending pairs by code" on public.pairs
  for select using (status = 'PENDING');

create policy "Users can insert pairs" on public.pairs
  for insert with check (true);

create policy "Users can update own pairs" on public.pairs
  for update using (
    id in (select pair_id from public.profiles where id = auth.uid())
  );
