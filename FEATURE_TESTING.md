# FacheeBook feature-by-feature verification

## Pass 1 — Reading material create / edit / delete

### Changes in this pass
- Mount the Add/Edit modal only while it is open and key it by material ID. This avoids calling hooks conditionally as the open prop changes and resets the form when switching between a new material and an existing one.
- Use functional React state updates for material saves and deletes, avoiding stale array closures when actions happen close together.
- Keep an open material detail view synchronized after saving edits, and close it when that material is deleted.
- Reject malformed/non-HTTP video URLs, block duplicate video links, and avoid duplicate key takeaways.
- Normalize page counts to whole numbers and enforce `0 <= pagesRead <= totalPages` when saving.

### Verification status
- Source changes reviewed and archive structure checked.
- `npm ci` did not finish in the available environment, leaving an incomplete `node_modules` directory.
- `npm run lint` could not complete because type-definition packages were incomplete.
- `npm run build` could not run because Vite was not installed after the interrupted install.
- Therefore, build/runtime verification remains pending. Run `npm ci`, `npm run lint`, and `npm run build` on a machine with package-registry access before treating this pass as fully verified.

## Remaining passes
1. Attachments and media upload / removal / preview.
2. Reading progress and status changes.
3. Flashcards and quiz interactions.
4. Study timer and notifications.
5. Import / export and backup recovery.
6. Study tips, voice recording, and profile settings.
7. Responsive layout and Android-specific behavior.

## Pass 2 — Attachments and media handling

### Changes in this pass
- Validate uploaded file type for photos and videos and reject empty files.
- Add explicit per-file limits: photos 10 MB, short videos 30 MB, documents 20 MB, and a combined 80 MB attachment budget per material.
- Process files sequentially and show visible progress / success / rejection feedback instead of silently failing.
- Handle FileReader errors and cancellations; preserve original file data for download when text preview is unavailable.
- Add plain-text previews for more common source and log file extensions.
- Make camera snapshots respect the attachment budget, use a lower JPEG quality to reduce storage, and guard video recording against unsupported MediaRecorder formats.
- Validate recorded clip size before saving, and show actionable errors when recording or file reading fails.
- Tighten video-host detection so unrelated domains containing words like `youtube.com` are not incorrectly categorized as YouTube links.

### Verification status
- Source reviewed and archive structure checked.
- A TypeScript check was attempted, but dependency installation timed out and left missing type-definition packages; this is an environment/dependency issue and means type-check/build verification is still pending.
- On a machine with package-registry access, run `npm ci`, `npm run lint`, and `npm run build`. Then manually test photo upload/removal, document upload/download, short-video upload, camera snapshot, recording, oversized files, invalid file types, and saving/reopening the material.

## Remaining passes
1. Reading progress and status changes.
2. Flashcards and quiz interactions.
3. Study timer and notifications.
4. Import / export and backup recovery.
5. Study tips, voice recording, and profile settings.
6. Responsive layout and Android-specific behavior.

## Pass 3 — Reading progress, daily goals, and status consistency

### Changes in this pass
- Centralize daily-goal achievement streak handling so reaching a goal for the first time on a day starts or increments a streak exactly once.
- Route progress changes made in the material detail view through the same progress handler as card and roadmap changes, so page totals and daily goals do not silently diverge.
- Use functional material-state updates for progress changes to reduce stale-state issues during quick successive actions.
- Keep the currently open detail view synchronized when its reading progress or status changes.
- Remove a deleted material from the daily reviewed-material list so deleted items do not continue counting toward the daily material target.
- Clamp page updates to non-negative values and the material's page count where a page count is defined.

### Verification status
- Reviewed the modified handlers and confirmed the package includes the changes.
- Attempted `npm run lint`; it fails because the interrupted dependency installation left many incomplete `@types` packages (for example `@types/node`, `@types/express`, and `@types/canvas-confetti`).
- `npm ci` timed out in this environment, so no successful production build or runtime test can be claimed yet.
- Manual test plan: update pages from a card, update pages from the detail view, mark a material complete and then reopen it, hit a daily goal and verify the streak changes only once, delete a reviewed material, reload the app, and verify all counts persist.

## Remaining passes
1. Flashcards and quiz interactions.
2. Study timer and notifications.
3. Import / export and backup recovery.
4. Study tips, voice recording, and profile settings.
5. Responsive layout and Android-specific behavior.


## Pass 4 — Flashcards and active recall

### Changes in this pass
- Move all React hooks before the closed-modal early return so opening and closing the modal does not violate the Rules of Hooks.
- Generate cards only from non-empty key takeaways and show a clear empty state when no cards are available.
- Use a meaningful recall prompt tied to the source material instead of displaying a generic numbered “key concept” label.
- Track each card's rating by stable card ID, derive mastered/review totals from those responses, and allow ratings to be revised when navigating back.
- Navigate to the next unanswered card so using Next/Previous cannot accidentally finish a deck with unanswered cards.
- Add keyboard support (Escape to close, Space to flip, arrow keys to navigate), dialog semantics, accessible button labels, visible focus states, and larger mobile-friendly controls.
- Reset session state when a new deck is opened or the selected material changes; handle confetti failure without interrupting the study session.

### Verification status
- Source reviewed and archive integrity will be checked after packaging.
- `npm ci` timed out in this environment; TypeScript and production build checks could not be completed.
- Manual test plan: open and close the modal repeatedly; open a material-specific deck; test the empty state; flip cards by clicking and Space; navigate backward and forward; rate cards in different orders; revise a rating; verify all cards are answered before the summary appears; restart the session; close with Escape; and test on a narrow mobile viewport.
- Build/runtime verification remains pending. Run `npm ci`, `npm run lint`, and `npm run build` on a machine with package-registry access before treating this pass as fully verified.

## Remaining passes
1. Study timer and notifications.
2. Import / export and backup recovery.
3. Study tips, voice recording, and profile settings.
4. Responsive layout and Android-specific behavior.
