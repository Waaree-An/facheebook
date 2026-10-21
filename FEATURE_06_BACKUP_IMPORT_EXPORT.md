# Feature 06 — Import, export, and backup safety

## Changes
- Export files use a versioned `facheebook-backup` format and include materials, attachments (including embedded data URLs), and study tips.
- Blob URLs are revoked after a short delay so browsers have time to start the download.
- Clipboard failures are reported instead of pretending copy succeeded.
- Import rejects empty or over-100-MB files, malformed JSON, unsupported formats, invalid material records, invalid tip records, and unexpectedly large entry counts before updating app state.
- Legacy material-array imports and prior `Fachee United` bundle exports remain supported.
- Existing records are preserved. Duplicate IDs are skipped both against the current library and within the imported file.
- Import status is visible and announced to assistive technology; the file picker can be used repeatedly with the same filename.
- Fixed the ShareModal conditional-hook ordering by running hooks before its closed-state return.

## Verification
- `tsc --noEmit` was attempted, but this environment does not have project dependencies installed. It reports missing modules including React, Vite, Express, and Node types; this is an environment/dependency limitation, not a successful type check.
- Manual verification still needed after `npm ci`: export a backup, import it into a clean profile, re-import the same file to verify duplicates are skipped, test malformed JSON, test a valid legacy array, and verify attachments remain available.
