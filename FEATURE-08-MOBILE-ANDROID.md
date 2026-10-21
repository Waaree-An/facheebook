# Feature 08 — Mobile and Android usability

## Changes
- Added `viewport-fit=cover` and `interactive-widget=resizes-content` viewport behavior, plus mobile theme/status-bar metadata.
- Enabled Android `adjustResize` so forms can resize around the soft keyboard.
- Updated the Android launcher/activity label to `FacheeBook`.
- Updated the Capacitor app name to `FacheeBook`.
- Added a Visual Viewport keyboard detector that hides the floating mobile action dock while the soft keyboard is open.
- Added safe-area-aware page padding, dynamic viewport sizing, reduced horizontal overflow, improved mobile input sizing, and better tap-target ergonomics.

## Manual regression checklist
1. On a narrow screen, navigate through Materials, Roadmap, Tips, Flashcards and About.
2. Open search and each form; focus an input and confirm the dock disappears while the keyboard is visible.
3. Confirm Save/Cancel and lower form fields remain reachable when the keyboard is open.
4. Rotate the device and check for clipped dialogs or sideways scrolling.
5. On Android, build and launch the Capacitor app; verify keyboard resize, safe areas, status bar, and returning from background.
6. Check external links, video previews, file picking and notifications on an actual device.

## Verification status
Source and configuration edits are included in this package. A ZIP integrity check is not a substitute for a device test; run `npm ci`, `npm run lint`, `npm run build`, then `npx cap sync android` and build in Android Studio. Browser notifications and file/camera behavior vary by device and permission state.
