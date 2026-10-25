-- Enable private, approval-gated files and multiple public video links.
-- Run after 202610240002_community_materials.sql.

alter table public.community_materials
  add column if not exists video_links jsonb not null default '[]'::jsonb
  check (jsonb_typeof(video_links) = 'array');

create table if not exists public.community_material_attachments (
  id uuid primary key,
  material_id uuid not null references public.community_materials(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'community-materials' check (bucket_id = 'community-materials'),
  object_path text not null unique,
  name text not null check (char_length(btrim(name)) between 1 and 255),
  mime_type text not null,
  media_kind text not null check (media_kind in ('photo', 'document', 'short_video')),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  check (object_path = owner_id::text || '/' || material_id::text || '/' || id::text)
);

create index if not exists community_material_attachments_material_idx
  on public.community_material_attachments (material_id, created_at);

alter table public.community_material_attachments enable row level security;
revoke all on public.community_material_attachments from anon, authenticated;
grant select, insert, delete on public.community_material_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-materials',
  'community-materials',
  false,
  31457280,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.validate_community_material_attachment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_owner uuid;
  parent_status text;
  total_bytes bigint;
  attachment_count bigint;
  max_file_bytes bigint;
  allowed_mime boolean;
begin
  select owner_id, status
  into parent_owner, parent_status
  from public.community_materials
  where id = new.material_id
  for update;

  if parent_owner is null or parent_owner <> new.owner_id or parent_status <> 'pending' then
    raise exception 'Attachments can only be added to your pending community material' using errcode = '42501';
  end if;

  max_file_bytes := case new.media_kind
    when 'photo' then 10485760
    when 'document' then 20971520
    when 'short_video' then 31457280
    else 0
  end;
  allowed_mime := case new.media_kind
    when 'photo' then new.mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
    when 'document' then new.mime_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'text/csv'
    )
    when 'short_video' then new.mime_type in ('video/mp4', 'video/webm')
    else false
  end;
  if not allowed_mime or new.size_bytes > max_file_bytes then
    raise exception 'Attachment type or per-file size is not allowed' using errcode = '22023';
  end if;

  select coalesce(sum(size_bytes), 0), count(*)
  into total_bytes, attachment_count
  from public.community_material_attachments
  where material_id = new.material_id;
  if attachment_count >= 20 then
    raise exception 'A community material can include at most 20 files' using errcode = '22023';
  end if;
  if total_bytes + new.size_bytes > 83886080 then
    raise exception 'Attachments exceed the 80 MB per-post limit' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_community_material_attachment on public.community_material_attachments;
create trigger validate_community_material_attachment
  before insert on public.community_material_attachments
  for each row execute function public.validate_community_material_attachment();
revoke all on function public.validate_community_material_attachment() from public, anon, authenticated;

create or replace function public.validate_community_material_video_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(new.video_links) <> 'array' then
    raise exception 'Video links must be provided as a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(new.video_links) > 20 then
    raise exception 'A community material can include at most 20 video links' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.video_links) as link(value)
    where jsonb_typeof(link.value) <> 'object'
      or coalesce(link.value ->> 'id', '') = ''
      or char_length(coalesce(link.value ->> 'title', '')) not between 1 and 200
      or char_length(coalesce(link.value ->> 'url', '')) not between 1 and 2048
      or (link.value ->> 'url') !~* '^https?://'
  ) then
    raise exception 'Video links must be valid HTTP or HTTPS URLs, with at most 20 links' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_community_material_video_links on public.community_materials;
create trigger validate_community_material_video_links
  before insert or update on public.community_materials
  for each row execute function public.validate_community_material_video_links();
revoke all on function public.validate_community_material_video_links() from public, anon, authenticated;

drop policy if exists "Users read attachments for visible community materials" on public.community_material_attachments;
create policy "Users read attachments for visible community materials" on public.community_material_attachments
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select public.is_community_moderator())
    or exists (
      select 1
      from public.community_materials material
      where material.id = material_id
        and material.status = 'approved'
    )
  );

drop policy if exists "Students attach files to their pending materials" on public.community_material_attachments;
create policy "Students attach files to their pending materials" on public.community_material_attachments
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.community_materials material
      where material.id = material_id
        and material.owner_id = (select auth.uid())
        and material.status = 'pending'
    )
  );

drop policy if exists "Authors remove pending attachments and moderators remove any attachment" on public.community_material_attachments;
create policy "Authors remove pending attachments and moderators remove any attachment" on public.community_material_attachments
  for delete to authenticated
  using (
    (owner_id = (select auth.uid()) and exists (
      select 1
      from public.community_materials material
      where material.id = material_id
        and material.status = 'pending'
    ))
    or (select public.is_community_moderator())
  );

drop policy if exists "Users read storage for visible community materials" on storage.objects;
create policy "Users read storage for visible community materials" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-materials'
    and exists (
      select 1
      from public.community_material_attachments attachment
      join public.community_materials material on material.id = attachment.material_id
      where attachment.bucket_id = storage.objects.bucket_id
        and attachment.object_path = storage.objects.name
        and (
          attachment.owner_id = (select auth.uid())
          or material.status = 'approved'
          or (select public.is_community_moderator())
        )
    )
  );

drop policy if exists "Students upload files for their pending community materials" on storage.objects;
create policy "Students upload files for their pending community materials" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-materials'
    and exists (
      select 1
      from public.community_material_attachments attachment
      join public.community_materials material on material.id = attachment.material_id
      where attachment.bucket_id = storage.objects.bucket_id
        and attachment.object_path = storage.objects.name
        and attachment.owner_id = (select auth.uid())
        and material.owner_id = (select auth.uid())
        and material.status = 'pending'
    )
  );

drop policy if exists "Authors remove pending community uploads and moderators remove any upload" on storage.objects;
create policy "Authors remove pending community uploads and moderators remove any upload" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-materials'
    and exists (
      select 1
      from public.community_material_attachments attachment
      join public.community_materials material on material.id = attachment.material_id
      where attachment.bucket_id = storage.objects.bucket_id
        and attachment.object_path = storage.objects.name
        and (
          (attachment.owner_id = (select auth.uid()) and material.status = 'pending')
          or (select public.is_community_moderator())
        )
    )
  );
