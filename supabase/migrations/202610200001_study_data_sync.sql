-- Adds conflict timestamps and soft-deletion records for account-scoped study sync.
-- Run after 202610160001_facheebook_cloud.sql.

alter table public.study_materials
  add column if not exists deleted_at timestamptz,
  alter column payload drop not null;

alter table public.study_tips
  add column if not exists deleted_at timestamptz,
  alter column payload drop not null;

create index if not exists study_materials_user_updated_idx
  on public.study_materials (user_id, updated_at desc);

create index if not exists study_tips_user_updated_idx
  on public.study_tips (user_id, updated_at desc);

-- Payloads on deletion-only rows may be null, avoiding a large duplicate local
-- attachment payload when a newly-created item is deleted before its first sync.
-- Keep client-provided timestamps for conflict resolution.
