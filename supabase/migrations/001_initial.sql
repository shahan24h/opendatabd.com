-- ─────────────────────────────────────────────────────────────────────────────
-- OpenDataBD — initial schema
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Helper: auto-update updated_at ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users and stores extra public info.

create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        unique not null,
  full_name    text        not null default '',
  organization text,
  role         text        not null default 'contributor'
                             check (role in ('contributor', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ── Datasets ─────────────────────────────────────────────────────────────────

create table if not exists public.datasets (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  description  text,
  category     text        not null,
  subcategory  text,
  format       text[]      not null default '{}',
  source       text,
  source_url   text,
  division     text,
  license      text        not null default 'Open Data',
  rows_count   integer,
  file_size    text,
  tags         text[]      not null default '{}',
  downloads    integer     not null default 0,
  views        integer     not null default 0,
  status       text        not null default 'pending'
                             check (status in ('active', 'pending', 'rejected')),
  submitted_by uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.datasets enable row level security;

-- Public read for active datasets
create policy "datasets_select_active"
  on public.datasets for select
  using (status = 'active');

-- Authenticated users can submit
create policy "datasets_insert_auth"
  on public.datasets for insert
  with check (auth.uid() = submitted_by);

-- Owners can update / delete their own
create policy "datasets_update_own"
  on public.datasets for update
  using (auth.uid() = submitted_by);

create policy "datasets_delete_own"
  on public.datasets for delete
  using (auth.uid() = submitted_by);

-- Performance indexes
create index if not exists datasets_category_idx  on public.datasets (category);
create index if not exists datasets_status_idx    on public.datasets (status);
create index if not exists datasets_created_idx   on public.datasets (created_at desc);
create index if not exists datasets_submitted_idx on public.datasets (submitted_by);

create trigger datasets_updated_at
  before update on public.datasets
  for each row execute procedure public.set_updated_at();
