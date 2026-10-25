-- Persistent likes and comments for approved community tips and materials.
-- Run after 202610240003_community_material_media.sql.

create table if not exists public.community_material_likes (
  material_id uuid not null references public.community_materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (material_id, user_id)
);

create table if not exists public.community_material_comments (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.community_materials(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.community_tip_comments (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.community_tips(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_material_comments_post_created_idx
  on public.community_material_comments (material_id, created_at);
create index if not exists community_tip_comments_post_created_idx
  on public.community_tip_comments (tip_id, created_at);

alter table public.community_material_likes enable row level security;
alter table public.community_material_comments enable row level security;
alter table public.community_tip_comments enable row level security;

revoke all on public.community_material_likes from anon, authenticated;
revoke all on public.community_material_comments from anon, authenticated;
revoke all on public.community_tip_comments from anon, authenticated;
grant select, insert, delete on public.community_material_likes to authenticated;
grant select, insert on public.community_material_comments to authenticated;
grant select, insert on public.community_tip_comments to authenticated;

drop policy if exists "Signed-in users read likes on visible community materials" on public.community_material_likes;
create policy "Signed-in users read likes on visible community materials"
  on public.community_material_likes for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.community_materials material
      where material.id = material_id and material.status = 'approved'
    )
  );

drop policy if exists "Students like approved community materials" on public.community_material_likes;
create policy "Students like approved community materials"
  on public.community_material_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select public.is_community_suspended())
    and exists (
      select 1 from public.community_materials material
      where material.id = material_id and material.status = 'approved'
    )
  );

drop policy if exists "Students remove their own community material likes" on public.community_material_likes;
create policy "Students remove their own community material likes"
  on public.community_material_likes for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Signed-in users read comments on visible community materials" on public.community_material_comments;
create policy "Signed-in users read comments on visible community materials"
  on public.community_material_comments for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.community_materials material
      where material.id = material_id and material.status = 'approved'
    )
  );

drop policy if exists "Students comment on approved community materials" on public.community_material_comments;
create policy "Students comment on approved community materials"
  on public.community_material_comments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not (select public.is_community_suspended())
    and exists (
      select 1 from public.community_materials material
      where material.id = material_id and material.status = 'approved'
    )
  );

drop policy if exists "Signed-in users read comments on visible community tips" on public.community_tip_comments;
create policy "Signed-in users read comments on visible community tips"
  on public.community_tip_comments for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.status = 'approved'
    )
  );

drop policy if exists "Students comment on approved community tips" on public.community_tip_comments;
create policy "Students comment on approved community tips"
  on public.community_tip_comments for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not (select public.is_community_suspended())
    and exists (
      select 1 from public.community_tips tip
      where tip.id = tip_id and tip.status = 'approved'
    )
  );
