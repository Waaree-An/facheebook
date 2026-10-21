# FacheeBook — Supabase cloud setup (foundation)

This version's existing materials and tips are still stored locally in IndexedDB. The SQL migration below prepares secure per-user cloud tables; it does not automatically sync the existing browser data yet. Do not delete browser data during setup.

## 1. Configure the local app

1. In the project root, copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to your project URL.
3. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to your `sb_publishable_...` key.
4. Keep `.env.local` private. It is ignored by Git. Never use a `sb_secret_...` key in the app.

## 2. Create the secure database tables

1. Open your Supabase project dashboard.
2. Open SQL Editor and create a new query.
3. Paste and run `supabase/migrations/202610160001_facheebook_cloud.sql`.
4. In Authentication settings, configure the site's URL and allowed redirect URLs for the development and production URLs you use.
5. Test email signup and verification before distributing the app. Supabase's default email service may have sending limits.

## Important status

This is the secure database foundation only. The current React app has not yet been changed to use Supabase Auth or sync IndexedDB rows. That integration must be added and tested before calling the app cloud-connected. The `payload` JSONB columns are intentional to preserve the existing app's material/tip shapes while a migration adapter is implemented.


## Student profiles and FacheeBook IDs (new)
After the cloud foundation migration has been applied, run `supabase/migrations/202610190001_student_profiles_and_ids.sql` in the Supabase SQL Editor. It adds the academic profile fields and permanent FacheeBook IDs in the `FU-YYNNN` format (for example `FU-26001`). IDs are assigned in the database, not in the browser. The `profiles` row is private to its authenticated owner through the existing RLS policy.
