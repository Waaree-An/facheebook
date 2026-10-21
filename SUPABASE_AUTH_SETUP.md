# FacheeBook Supabase Auth (Step 1)

This step adds Supabase email/password authentication, account creation, password recovery, and cloud sign-out. Password recovery lets the user set a new password after following the emailed link. Signing out clears the account session and cached student profile but does not delete IndexedDB study data.

## Configure locally

1. In the project root, copy `.env.example` to `.env.local`.
2. In `.env.local`, set:
   - `VITE_SUPABASE_URL=https://tfjheiyzphvjjgidwjyq.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=your actual sb_publishable key`
3. Do not commit `.env.local` or put a `service_role`/secret key in the app.
4. Run `npm install` (not `npm ci`, because this step adds `@supabase/supabase-js` and the lockfile may need to refresh), then `npm run lint` and `npm run build`.
5. Run `npm run dev` and test account creation, email confirmation, sign in, password reset and update, and sign out with both a completed student profile and a new account without a profile.

## Supabase dashboard

In Authentication → URL Configuration, set the Site URL to the local development URL used by this project (`http://localhost:3000` when using the included `npm run dev` Express/Vite server). Add the same local URL to Redirect URLs. For deployed web builds, add the deployed URL. For Android, configure the intended redirect scheme/URL before testing password reset links in the WebView.

Email confirmation may be enabled by default. If enabled, users must click the confirmation email before password sign-in works. The built-in email sender can be rate-limited; test delivery before depending on it.

## Scope and data safety

- Existing IndexedDB materials and local profile are preserved.
- Sign-out clears the Supabase session and cached student profile; it does not delete local study materials, tips, or progress.
- This step establishes authentication, not yet cloud syncing of materials, attachments, flashcards, or study progress. The local library remains the source of truth until a separately tested sync/migration step is implemented.
- RLS migration is provided in `supabase/migrations/202610160001_facheebook_cloud.sql`. Keep RLS enabled and never expose a secret/service-role key in a client app.
