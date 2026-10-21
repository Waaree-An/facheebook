# Usability Polish — Step 09

## Changes
- Added a sign-out control when a student profile is present.
- Sign-out asks for confirmation and clearly explains that study materials, tips, and progress remain saved on the device.
- Sign-out removes only `fachee_student_profile` from localStorage and clears the profile UI state. It does not erase library data.
- Clarified profile action label from “Student ID” to “Edit profile”.
- Simplified the materials-page heading and description, and standardized the primary action to “Add material”.
- Reworded the footer attribution to use a more neutral, grammatical sentence.

## Important limitation
FacheeBook currently stores the student profile locally and does not implement authenticated user accounts or server-side sessions. Therefore, “Sign out” clears the local student profile only; it is not a security boundary and does not prevent someone using the same device/browser from accessing locally stored study data. For shared-device privacy, a real account/authentication model and per-user data separation would be needed.

## Verification
The source ZIP was unpacked and the changed files were inspected. `npm ci` did not complete in this environment (transport timeout), so lint and production build could not be run. Please run `npm ci`, `npm run lint`, and `npm run build` after extracting this project.
