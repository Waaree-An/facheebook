FacheeBook



FacheeBook is a student-focused learning application designed to support students with learning resources and study tools. This repository contains the existing web application, Node.js server, and Capacitor Android project.



Technology Stack



Frontend: React 19, TypeScript, Vite



Server: Node.js, Express 4



Android: Capacitor 8



Styling: Tailwind CSS 4



Icons: Lucide React



Motion: Motion



AI integration: Google GenAI SDK



Build tools: Vite, esbuild, TypeScript, tsx



These dependencies are declared in package.json. Their actual use should be verified against the source code.



Project Structure



src/ — application source code



android/ — native Android project



server.ts — server entry point



capacitor.config.ts — Capacitor configuration



index.html — frontend HTML entry point



metadata.json — application metadata



package.json — scripts and dependencies



package-lock.json — npm dependency lockfile



bun.lock — Bun lockfile



tsconfig.json — TypeScript configuration



vite.config.ts — Vite configuration



.env.example — environment-variable template



Prerequisites



Install a compatible version of Node.js and npm. Android development additionally requires the Android development tools appropriate for the existing Capacitor project.



Installation



From the project root, install the npm dependencies:



npm ci



Development



Start the development server:



npm run dev



The command runs tsx server.ts. Inspect server.ts to confirm the local address, port, and available routes.



Build



Build the frontend and bundle the server:



npm run build



The configured build runs vite build, then bundles server.ts using esbuild into dist/server.cjs.

The frontend build splits less-frequently used screens and dialogs into on-demand chunks. The material detail view, roadmap, study tips, About section, and modal tools are downloaded when opened. React and Supabase are emitted as separate shared vendor chunks for browser caching.



Run the Production Server



After a successful build:



npm start



This runs node dist/server.cjs.



Check the server configuration to determine the port and how frontend assets are served.



Preview the Frontend Build



npm run preview



This starts Vite's preview server for the built frontend. It is not a substitute for testing the complete production server.



Type Checking



npm run lint



Despite the script name, this command runs tsc --noEmit for TypeScript type checking; it does not run a dedicated linting tool.



Clean Build Output



The configured command is:



npm run clean



Note: The script uses rm -rf, which is Unix-style syntax. On Windows, this may not work in a standard Command Prompt or PowerShell environment. Review the script before using it on Windows.



Android



The repository contains an android/ directory and capacitor.config.ts.



Before building Android, inspect the Capacitor configuration, the Android project, and the installed Android tooling. Confirm how the web assets are built and synchronized with the native project before following the Android release workflow.



Environment Variables and Security



Review .env.example and the server source to identify required environment variables.



Never commit real API keys, passwords, signing credentials, or production database credentials. Keep actual local secrets in an untracked environment file and use placeholders in documentation.

### .env.example vs .env.local

The project uses two environment files, and the difference matters for security:

- `.env.example` is tracked by git. It is a template only and must never contain a real key. It documents every supported variable with placeholder values.
- `.env.local` is gitignored and is the only place real secrets belong. Copy `.env.example` to `.env.local` and fill in the real values there.

The server loads `.env` (shared defaults) first and then `.env.local` (developer secrets win) - see the `dotenv.config` calls at the top of `server.ts`. Because `.env.local` is loaded with `override: true`, a stale shell variable cannot silently shadow your local key.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | For cloud features | Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | For cloud features | Supabase publishable key. |
| `GEMINI_API_KEY` | No | Enables real AI generation. Without it the AI endpoints return offline fallback content. |
| `GEMINI_MODEL` | No | Primary model. Defaults to `gemini-3.8-flash`. |
| `GEMINI_FALLBACK_MODELS` | No | Comma-separated fallback models, tried in order when the primary is out of quota or overloaded. |
| `AI_MAX_ATTEMPTS` | No | Retries per model for transient upstream failures. Defaults to `3`. |
| `AI_TIMEOUT_MS` | No | Per-request AI timeout in milliseconds. Defaults to `60000`. |
| `PORT` | No | HTTP port for the Express server. Defaults to `3000`. |

### AI behaviour and failure handling

Three endpoints use the Gemini API: `/api/study-summary`, `/api/ai-generate-quiz`, and `/api/ai-study-tip`. Every response carries a `source` field:

- `source: "ai"` - the content was generated by Gemini.
- `source: "fallback"` - the server served offline sample content because Gemini was unavailable.

This tag matters because the fallback content is deliberately high quality, so without it a broken AI path is indistinguishable from a working one. The UI uses it to tell the student when a result is a sample rather than real AI output.

The server distinguishes two upstream failure modes:

- **Transient errors** (HTTP 503 "high demand") are retried on the same model with exponential backoff (`AI_MAX_ATTEMPTS` attempts, `AI_RETRY_BASE_DELAY_MS` base delay).
- **Quota exhaustion** (HTTP 429 `RESOURCE_EXHAUSTED`) is not retryable, because Gemini enforces the free-tier request quota per model and per day. Instead of retrying, the server advances to the next model in the chain.

Because the quota is per model, an exhausted primary model does not disable the AI feature as long as a fallback model still has quota. Check which models your key can reach with:

```
node scripts/probe-models.mjs
```

Readiness is visible without exposing the key:

```
GET /api/health
```

It returns `ai.configured`, `ai.model`, and `ai.modelChain` (the ordered candidate list).

### Smoke testing

`smoke-test.cjs` drives the production build in headless Chrome over the Chrome DevTools Protocol. It asserts `/api/health` readiness and that all three AI endpoints return `source: "ai"`, so a regression that silently reverts to fallback content fails the suite.

```
node smoke-test.cjs
```

Set `APP_URL` to point at a different host or port (default `http://localhost:4002`).



Development Status



The current implementation must be audited before declaring which features are complete, which tests pass, or whether the app is ready for release.



Refer to PROJECT\_HANDOVER.md for the project audit, known issues, and next-version plan.



## Improved interface and keyboard controls

- Use `/` or `Ctrl/Cmd + K` to focus material search. Press `Esc` to clear the current query.
- The Materials page shows live counts for saved, in-progress, completed, and review-due materials.
- Use the result bar's **Clear filters** action to return to the full library.
- On mobile, the bottom quick-action dock keeps Search, Add Material, and Study Timer within thumb reach.
- Copy `.env.example` to `.env` and optionally set `GEMINI_API_KEY`; core library features do not require the key.
- Configure the HTTP port with `PORT` (defaults to `3000`).


## Feature pass 2: attachments and media

Attachment uploads now validate file types and sizes, report progress and failures visibly, and enforce per-file and per-material size limits to reduce the risk of exhausting browser storage. In-browser camera and video recording paths also check device support and clip sizes. See `FEATURE_TESTING.md` for the changes and manual test checklist.

## Feature 05: Study timer

See [FEATURE_05_STUDY_TIMER.md](./FEATURE_05_STUDY_TIMER.md) for the timer improvements and manual verification checklist. The timer now uses deadline-based elapsed-time tracking and stores session state locally.


## Restoration pass (October 2026)

This pass preserves the existing Step 11 feature set and makes the brand and first-run experience more consistent.

- Standardized the visual palette around charcoal `#080A0B`, surface `#111619`, raised surface `#1B242A`, gold `#F4C75B`, and deep gold `#B8860B`.
- Replaced several leftover blue/pale gradient surfaces with dark-and-gold surfaces.
- Simplified **Add study material**: title and subject stay up front; course metadata and study notes are optional expandable sections.
- Added a local-library fallback when Supabase configuration is missing so the setup screen cannot permanently hide the existing study features. This mode is local-only and does not claim cloud sync.
- Kept existing IndexedDB database naming intact to protect local browser data.
- Removed `.env.local` from the distributed archive; copy your own file into the project root after extraction.

### Important release status

Signed-in accounts now sync study materials and study tips across devices. Apply the migrations in order in the Supabase SQL Editor: `202610160001_facheebook_cloud.sql`, `202610190001_student_profiles_and_ids.sql`, then `202610200001_study_data_sync.sql`. The client uses the existing authenticated-user RLS policies; never put a service-role key in the app.

Each account has a separate local library. Existing signed-out device data stays local until the signed-in user explicitly chooses **Review and import**. Import merges by ID, asks for confirmation when duplicates exist, keeps the newer version, and preserves the original local library. Material and tip changes sync automatically when online; deletion records are retained and synced as soft-delete tombstones.

Only study metadata and text sync. Attachment file data and voice recordings remain on the originating device; flashcards, study goals, timer state, and other progress are not cloud-synced. Cloud conflict resolution uses the record timestamps (the latest timestamp wins; ties keep the account copy). Test with separate accounts and devices before release. Android redirect behavior, privacy policy/data-safety declarations, signed App Bundle generation, and Play Console testing remain release tasks.

### Verification status

The edited TypeScript/TSX files passed a syntax transpilation check. A full TypeScript check and production build could not be run in this environment because dependency installation could not complete. Run `npm ci`, `npm run lint`, and `npm run build` on a machine with registry access before treating this archive as release-ready.
