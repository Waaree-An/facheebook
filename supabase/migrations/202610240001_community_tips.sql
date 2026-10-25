-- Approval-based student study tips.
-- Run after 202610200001_study_data_sync.sql.

create table if not exists public.community_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_tips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  author_name text not null check (char_length(btrim(author_name)) between 1 and 60),
  category text not null check (category in (
    'active_recall', 'time_management', 'note_taking',
    'exam_prep', 'wellness', 'resource_sharing'
  )),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_tip_likes (
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);

create table if not exists public.community_tip_reports (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harmful', 'copyright', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tip_id, reporter_id)
);

create table if not exists public.community_user_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  suspended_until timestamptz,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists community_tips_status_created_idx
  on public.community_tips (status, created_at desc);
create index if not exists community_tips_owner_created_idx
  on public.community_tips (owner_id, created_at desc);
create index if not exists community_tip_reports_status_created_idx
  on public.community_tip_reports (status, created_at desc);

alter table public.community_moderators enable row level security;
alter table public.community_tips enable row level security;
alter table public.community_tip_likes enable row level security;
alter table public.community_tip_reports enable row level security;
alter table public.community_user_suspensions enable row level security;

revoke all on public.community_moderators from anon, authenticated;
revoke all on public.community_tips from anon, authenticated;
revoke all on public.community_tip_likes from anon, authenticated;
revoke all on public.community_tip_reports from anon, authenticated;
revoke all on public.community_user_suspensions from anon, authenticated;

grant select, insert, update, delete on public.community_tips to authenticated;
grant select, insert, delete on public.community_tip_likes to authenticated;
grant select, insert on public.community_tip_reports to authenticated;

create or replace function public.is_community_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_moderators
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_community_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_user_suspensions
    where user_id = (select auth.uid())
      and (suspended_until is null or suspended_until > now())
  );
$$;

revoke all on function public.is_community_moderator() from public, anon;
revoke all on function public.is_community_suspended() from public, anon;
grant execute on function public.is_community_moderator() to authenticated;
grant execute on function public.is_community_suspended() to authenticated;

drop policy if exists "Signed-in users read approved tips and their own" on public.community_tips;
create policy "Signed-in users read approved tips and their own" on public.community_tips
  for select to authenticated
  using (status = 'approved' or owner_id = (select auth.uid()) or (select public.is_community_moderator()));

drop policy if exists "Students submit tips for review" on public.community_tips;
create policy "Students submit tips for review" on public.community_tips
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
    and not (select public.is_community_suspended())
  );

drop policy if exists "Students edit their pending tips" on public.community_tips;
create policy "Students edit their pending tips" on public.community_tips
  for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'pending')
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and moderated_by is null
    and moderated_at is null
    and not (select public.is_community_suspended())
  );

drop policy if exists "Moderators manage community tips" on public.community_tips;
create policy "Moderators manage community tips" on public.community_tips
  for all to authenticated
  using ((select public.is_community_moderator()))
  with check ((select public.is_community_moderator()));

drop policy if exists "Authors remove pending tips and moderators remove any tip" on public.community_tips;
create policy "Authors remove pending tips and moderators remove any tip" on public.community_tips
  for delete to authenticated
  using (
    (owner_id = (select auth.uid()) and status = 'pending')
    or (select public.is_community_moderator())
  );

drop policy if exists "Signed-in users read likes for approved tips" on public.community_tip_likes;
create policy "Signed-in users read likes for approved tips" on public.community_tip_likes
  for select to authenticated
  using (
    exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.status = 'approved'
    )
    or user_id = (select auth.uid())
  );

drop policy if exists "Students like approved tips" on public.community_tip_likes;
create policy "Students like approved tips" on public.community_tip_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select public.is_community_suspended())
    and exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.status = 'approved'
    )
  );

drop policy if exists "Students remove their own likes" on public.community_tip_likes;
create policy "Students remove their own likes" on public.community_tip_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Reporters and moderators read reports" on public.community_tip_reports;
create policy "Reporters and moderators read reports" on public.community_tip_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_community_moderator()));

drop policy if exists "Students report approved tips" on public.community_tip_reports;
create policy "Students report approved tips" on public.community_tip_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.status = 'approved'
    )
    and not exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Moderators manage reports" on public.community_tip_reports;
create policy "Moderators manage reports" on public.community_tip_reports
  for update to authenticated
  using ((select public.is_community_moderator()))
  with check ((select public.is_community_moderator()));

drop policy if exists "Moderators read suspensions" on public.community_user_suspensions;
create policy "Moderators read suspensions" on public.community_user_suspensions
  for select to authenticated
  using ((select public.is_community_moderator()));

create or replace function public.moderate_community_tip(
  target_tip_id uuid,
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
    raise exception 'Only community moderators can review tips' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;
  update public.community_tips
  set status = decision,
      moderation_note = nullif(btrim(note), ''),
      moderated_by = (select auth.uid()),
      moderated_at = now(),
      updated_at = now()
  where id = target_tip_id;
  if not found then
    raise exception 'Community tip not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.review_community_tip_report(
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
  update public.community_tip_reports
  set status = decision,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = target_report_id;
  if not found then
    raise exception 'Community tip report not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.set_community_user_suspension(
  target_user_id uuid,
  suspension_until timestamptz,
  suspension_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_community_moderator()) then
    raise exception 'Only community moderators can manage suspensions' using errcode = '42501';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'Moderators cannot suspend their own account' using errcode = '22023';
  end if;
  if suspension_reason is null then
    delete from public.community_user_suspensions where user_id = target_user_id;
    return;
  end if;
  if char_length(btrim(suspension_reason)) not between 1 and 1000 then
    raise exception 'Suspension reason must be between 1 and 1000 characters' using errcode = '22023';
  end if;
  insert into public.community_user_suspensions (user_id, suspended_until, reason, created_by)
  values (target_user_id, suspension_until, btrim(suspension_reason), (select auth.uid()))
  on conflict (user_id) do update
    set suspended_until = excluded.suspended_until,
        reason = excluded.reason,
        created_by = excluded.created_by,
        created_at = now();
end;
$$;

revoke all on function public.moderate_community_tip(uuid, text, text) from public, anon;
revoke all on function public.review_community_tip_report(uuid, text) from public, anon;
revoke all on function public.set_community_user_suspension(uuid, timestamptz, text) from public, anon;
grant execute on function public.moderate_community_tip(uuid, text, text) to authenticated;
grant execute on function public.review_community_tip_report(uuid, text) to authenticated;
grant execute on function public.set_community_user_suspension(uuid, timestamptz, text) to authenticated;

-- Bootstrap your creator/moderator account manually in the SQL editor:
-- insert into public.community_moderators (user_id, role)
-- select id, 'admin' from auth.users where email = lower('YOUR_ACCOUNT_EMAIL')
-- on conflict (user_id) do update set role = excluded.role;
