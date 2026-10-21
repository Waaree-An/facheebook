# Feature 05 — Study timer and notifications

## Improvements

- Replaced interval-tick subtraction with a deadline-based countdown. The remaining time is recalculated from `Date.now()`, so background-tab throttling does not make the timer drift.
- Preserves the running timer, selected mode, remaining time, and today's completed focus-session count in local storage.
- Resumes a valid running session after reload. If the saved deadline passed while the app was closed, it advances to the next mode and records a completed focus session where appropriate.
- Automatically alternates between 25-minute focus and 5-minute break sessions; only completed focus sessions increase the sprint count.
- Resets the daily sprint count when the device's local calendar date changes.
- Adds an explicit notification-permission action and a clear explanation for granted, denied, or unsupported browser notification states.
- Adds larger, more deliberate controls, accessible dialog and progress semantics, Escape-to-close, backdrop-to-close, and a clamped progress indicator.
- Audio and confetti are best-effort effects. The countdown remains functional if they are unavailable.

## Manual verification checklist

1. Open the timer. Confirm the focus mode begins at `25:00` and break mode at `05:00`.
2. Start, pause, resume, and reset. Confirm the timer doesn't jump or continue while paused.
3. Start a session, reload the page, and confirm a running session resumes with the correct remaining time.
4. While a session is running, switch to another tab for at least 10 seconds, return, and confirm elapsed time was accounted for.
5. For practical testing, temporarily use browser devtools to set the saved deadline a few seconds in the past. Confirm focus expiry increments the sprint count once and switches to a five-minute break; break expiry switches back to focus without incrementing the count.
6. Enable browser notifications on localhost or HTTPS and verify a completion alert. Also verify the app remains usable when permission is denied or notifications are unsupported.
7. Pause, close the modal, reopen it, and confirm the paused timer remains paused.
8. Test close button, backdrop click, Escape key, keyboard focus, and narrow/mobile viewport layout.

## Verification caveat

The updated TSX files passed a TypeScript transpilation syntax check. A complete type-check and production build were not available because `npm ci` did not finish in the build environment. Run the project's `npm ci`, `npm run lint`, and `npm run build` commands before deploying.
