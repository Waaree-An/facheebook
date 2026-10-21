# Student profile cloud update

## Included
- School placeholders now use examples relevant to the user's context, including `Fechatu Secondary School` and `Jimma University`.
- High-school stream is a dropdown: Natural Science, Social Science, or Other. Choosing Other reveals a custom text field.
- Profile saving is asynchronous and reports cloud-save failures instead of claiming success.
- Signed-in profile data loads from Supabase and edits are upserted to the signed-in user's `profiles` row.
- The existing local profile is retained as a cache, but the cloud profile is the source of truth for signed-in users.
- Student IDs are intended to use `FU-YYNNN`, e.g. `FU-26001`, allocated atomically by the database trigger rather than generated randomly in the client.

## Required Supabase action
Run `supabase/migrations/202610190001_student_profiles_and_ids.sql` in the Supabase SQL Editor after the existing cloud foundation migration. Without this migration, the new columns and ID trigger will not exist, and the app will display a cloud-save error instead of silently pretending it saved.

## Security
The existing `profiles` row-level security policy should remain enabled and should continue restricting each profile row to `auth.uid() = id`. The ID counter table is not exposed to anon or authenticated API roles. Do not add a Supabase service-role key to the client app.

## Verification note
The project source was updated. Automated lint/build verification could not complete in this environment because dependency installation timed out and left an incomplete `node_modules` directory. Reinstall dependencies locally with `npm ci`, then run `npm run lint` and `npm run build` before release.

## Study-data sync update
Signed-in accounts now sync material and study-tip records between devices. Apply `supabase/migrations/202610200001_study_data_sync.sql` after the two migrations above. The app uses account-specific IndexedDB databases; the existing local library remains separate unless the user explicitly reviews and imports it. Duplicate IDs prompt for confirmation and resolve by latest record timestamp (account copy wins ties). Cross-device deletions use soft-delete timestamps.

Attachments and tip voice recordings are intentionally excluded from cloud payloads. Flashcards and study progress are also still local-only. Verify the SQL migrations in the target Supabase project and test RLS, account switching, import, offline edits/deletes, and multi-device conflict cases before release.
