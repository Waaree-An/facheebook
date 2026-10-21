-- FacheeBook student profiles and permanent FU-YYNNN IDs.
-- Run after 202610160001_facheebook_cloud.sql in Supabase SQL Editor.

alter table public.profiles
  add column if not exists facheebook_id text unique,
  add column if not exists university_year text,
  add column if not exists high_school_name text,
  add column if not exists high_school_grade text,
  add column if not exists academic_stream text,
  add column if not exists primary_subjects jsonb not null default '[]'::jsonb;

create table if not exists public.facheebook_id_counters (
  registration_year text primary key,
  last_number integer not null check (last_number >= 0)
);

alter table public.facheebook_id_counters enable row level security;
revoke all on public.facheebook_id_counters from anon, authenticated;

create or replace function public.assign_facheebook_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  year_code text := to_char(coalesce(new.created_at, now()) at time zone 'UTC', 'YY');
  next_number integer;
begin
  if new.facheebook_id is null or btrim(new.facheebook_id) = '' then
    insert into public.facheebook_id_counters (registration_year, last_number)
    values (year_code, 1)
    on conflict (registration_year)
    do update set last_number = public.facheebook_id_counters.last_number + 1
    returning last_number into next_number;
    new.facheebook_id := 'FU-' || year_code || lpad(next_number::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_facheebook_id_before_insert on public.profiles;
create trigger assign_facheebook_id_before_insert
before insert or update on public.profiles
for each row execute function public.assign_facheebook_id();

-- Backfill existing profile rows through the same atomic allocator. The update trigger
-- assigns a unique ID whenever a row has no ID; this avoids fabricated or duplicate IDs.
do $$
declare r record;
begin
  for r in select id from public.profiles where facheebook_id is null order by created_at, id loop
    update public.profiles set facheebook_id = null where id = r.id;
  end loop;
end $$;

-- Trigger-created profiles get the first ID automatically. RLS continues to restrict
-- profile rows to auth.uid() = id via the policy from the foundation migration.
