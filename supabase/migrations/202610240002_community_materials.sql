-- Approval-based sharing of original study summaries and public links.
-- Run after 202610240001_community_tips.sql.

create table if not exists public.community_materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  subject text not null check (char_length(btrim(subject)) between 1 and 100),
  summary text not null check (char_length(btrim(summary)) between 1 and 10000),
  source_url text check (
    source_url is null
    or (char_length(source_url) <= 2048 and source_url ~* '^https?://')
  ),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_material_reports (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.community_materials(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harmful', 'copyright', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (material_id, reporter_id)
);

create index if not exists community_materials_status_created_idx
  on public.community_materials (status, created_at desc);
create index if not exists community_materials_owner_created_idx
  on public.community_materials (owner_id, created_at desc);
create index if not exists community_material_reports_status_created_idx
  on public.community_material_reports (status, created_at asc);

alter table public.community_materials enable row level security;
alter table public.community_material_reports enable row level security;

revoke all on public.community_materials from anon, authenticated;
revoke all on public.community_material_reports from anon, authenticated;
grant select, insert, update, delete on public.community_materials to authenticated;
grant select, insert on public.community_material_reports to authenticated;

drop policy if exists "Signed-in users read approved materials and their own" on public.community_materials;
create policy "Signed-in users read approved materials and their own" on public.community_materials
  for select to authenticated
  using (
    status = 'approved'
    or owner_id = (select auth.uid())
    or (select public.is_community_moderator())
  );

drop policy if exists "Students submit materials for review" on public.community_materials;
create policy "Students submit materials for review" on public.community_materials
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
    and not (select public.is_community_suspended())
  );

drop policy if exists "Students edit their pending materials" on public.community_materials;
create policy "Students edit their pending materials" on public.community_materials
  for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'pending')
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
    and not (select public.is_community_suspended())
  );

drop policy if exists "Moderators manage community materials" on public.community_materials;
create policy "Moderators manage community materials" on public.community_materials
  for all to authenticated
  using ((select public.is_community_moderator()))
  with check ((select public.is_community_moderator()));

drop policy if exists "Authors remove pending materials and moderators remove any material" on public.community_materials;
create policy "Authors remove pending materials and moderators remove any material" on public.community_materials
  for delete to authenticated
  using (
    (owner_id = (select auth.uid()) and status = 'pending')
    or (select public.is_community_moderator())
  );

drop policy if exists "Reporters and moderators read material reports" on public.community_material_reports;
create policy "Reporters and moderators read material reports" on public.community_material_reports
  for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (select public.is_community_moderator())
  );

drop policy if exists "Students report approved community materials" on public.community_material_reports;
create policy "Students report approved community materials" on public.community_material_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not (select public.is_community_suspended())
    and exists (
      select 1
      from public.community_materials material
      where material.id = material_id
        and material.status = 'approved'
        and material.owner_id <> (select auth.uid())
    )
  );

drop policy if exists "Moderators update material reports" on public.community_material_reports;
create policy "Moderators update material reports" on public.community_material_reports
  for update to authenticated
  using ((select public.is_community_moderator()))
  with check ((select public.is_community_moderator()));

create or replace function public.moderate_community_material(
  target_material_id uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_community_moderator()) then
    raise exception 'Only community moderators can review materials' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;
  update public.community_materials
  set status = decision,
      moderation_note = nullif(btrim(note), ''),
      moderated_by = (select auth.uid()),
      moderated_at = now(),
      updated_at = now()
  where id = target_material_id;
  if not found then
    raise exception 'Community material not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.review_community_material_report(
  target_report_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_community_moderator()) then
    raise exception 'Only community moderators can review reports' using errcode = '42501';
  end if;
  if decision not in ('resolved', 'dismissed') then
    raise exception 'Decision must be resolved or dismissed' using errcode = '22023';
  end if;
  update public.community_material_reports
  set status = decision,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = target_report_id;
  if not found then
    raise exception 'Community material report not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.moderate_community_material(uuid, text, text) from public, anon;
revoke all on function public.review_community_material_report(uuid, text) from public, anon;
grant execute on function public.moderate_community_material(uuid, text, text) to authenticated;
grant execute on function public.review_community_material_report(uuid, text) to authenticated;
