-- FacheeBook cloud foundation. Safe to run in Supabase SQL Editor.
-- All user-owned rows are protected by Row Level Security (RLS).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  education_level text,
  university_name text,
  major_faculty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_materials (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.study_tips (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.profiles enable row level security;
alter table public.study_materials enable row level security;
alter table public.study_tips enable row level security;

-- Remove broad API privileges, then grant only authenticated users the operations needed.
revoke all on public.profiles from anon, authenticated;
revoke all on public.study_materials from anon, authenticated;
revoke all on public.study_tips from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.study_materials to authenticated;
grant select, insert, update, delete on public.study_tips to authenticated;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage their own materials" on public.study_materials;
create policy "Users manage their own materials" on public.study_materials
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own tips" on public.study_tips;
create policy "Users manage their own tips" on public.study_tips
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create a profile row when a new Auth user registers.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();
