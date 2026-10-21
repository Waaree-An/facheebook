# FacheeBook: Product Direction and Usability Testing

This guide records the intended direction of FacheeBook and provides a practical way to test whether the app is clear, useful, and reliable for students. It is a working guide, not a claim that every feature has been tested or is ready for release.

## 1. Why FacheeBook exists

FacheeBook should help students spend more time learning and reading, and less time losing study time to distractions such as social media. It should feel like a supportive study companion: a guide that helps a student decide what to do, keep their materials in order, and continue their study journey.

The project began with a personal goal: help the founder's younger brother and peers study more with a mentor, adviser, and supporter along the way.

## 2. Product promise

> Open FacheeBook, know what to study next, and find your study materials without confusion.

Use this promise to guide navigation, feature placement, wording, and future development.

## 3. Organize the app around two clear places

### Home

Home is the student's daily starting point. It should answer:

- What should I work on today?
- How do I continue what I was studying?
- Am I making progress toward today's goal?
- Is there something important coming up?

Good candidates for Home:

- A clear **Continue studying** action for a recently opened or in-progress material.
- A small daily goal and progress summary.
- A short, prioritized list of upcoming study tasks or reminders.
- A few quick actions, such as finding a material, adding a material, or starting a study session.
- One helpful study suggestion when it is timely and does not distract from the main action.

Home should not become a second full library, a crowded dashboard, or an endless feed. Show a small useful preview and provide a clear route to the full feature.

### Library

Library is the organized home for study materials. Students should be able to find, understand, and manage their material here.

Good candidates for Library:

- Search, subject and status filters, and useful sorting.
- Clear material titles, subjects, reading status, and progress.
- Material details, notes, takeaways, links, and attachments.
- Actions to add, edit, review, or remove a material.

Keep the main library view easy to scan. Place less-used editing details and advanced filters out of the way until needed. Do not put every tool, setting, reminder, and account action in the material list.

### Supporting study tools

Flashcards, quizzes, the timer, the study calendar, study tips, roadmap, backup, profile, and account tools can support learning. They do not all need equal prominence.

- Give a tool a visible place when students use it regularly to study.
- Put occasional setup and maintenance actions in a sensible menu or settings area.
- Keep optional, experimental, or non-study features out of the main study path.
- Do not remove a working feature just because it is secondary; first make its purpose and location clearer.
- Avoid social feeds, engagement loops, or notifications that compete with reading and study time.

## 4. Product and writing principles

1. **Study first:** every prominent action should help a student learn, plan, or continue.
2. **One clear next step:** make the main action on a screen easy to identify.
3. **Simple organization:** Home is for today's work; Library is for finding and managing materials.
4. **Plain language:** prefer short, familiar words and short instructions. Explain an unfamiliar term where it first appears.
5. **Calm and respectful:** encourage progress without shaming students or using pressure to keep them in the app.
6. **Honest feedback:** clearly distinguish saved on this device from synced to an account. Do not report success when an action failed.
7. **Protect study work:** warn before destructive actions; do not silently discard local data, attachments, or unsynced changes.
8. **Mobile-friendly:** primary actions, form controls, text, and dialogs must work on a small screen and with the on-screen keyboard.
9. **Incremental changes:** test a focused change before adding another. Preserve working behavior unless a deliberate change is approved.

## 5. English and Afaan Oromoo

The first audience includes Ethiopian students, especially Afaan Oromoo speakers and students who may not be comfortable with complex English.

- Use simple English as the starting point throughout the app.
- Prefer familiar words such as **Today**, **Study**, **Materials**, **Progress**, and **Settings** over technical or abstract labels.
- Afaan Oromoo can make the app more welcoming and easier to understand. Add it where the wording is clear, appropriate, and checked with Oromo-speaking students.
- **Library / ManKitaa** is a promising name to explore, based on *mana kitaabaa*. Keep the familiar English label alongside it during testing so the meaning remains clear.
- Do not assume a coined spelling or translation is correct just because it sounds plausible. Ask fluent speakers which form feels natural, respectful, and easy to read.
- Keep translated labels short enough to fit buttons and mobile navigation.

### Language questions for student testing

- Can the student explain what each label means without help?
- Does the English wording feel simple and respectful?
- Does **ManKitaa** feel natural and understandable? Would the student use it?
- Should the Afaan Oromoo label appear beside the English label, below it, or only after choosing a language preference?
- Are dates, times, numbers, and study reminders easy to understand?

## 6. A simple usability test

Test with a few students from the intended audience, including Oromo-speaking students where possible. A small test is useful for finding confusing wording and navigation; it does not prove that every student will have the same experience.

### Before the test

- Use a test account and non-sensitive sample materials.
- Do not use real student passwords, private study documents, or production data.
- Test cloud features only against a configured test project and test accounts.
- Use a phone-sized screen as well as a desktop browser.
- Tell the student: “We are testing the app, not you. Please say what you expect and what feels confusing.”

### Ask the student to try these tasks

1. Open the app and tell me what you think Home is for.
2. Find a material you were studying and continue it.
3. Find a material for a particular subject or status.
4. Add a material with a title and subject, then find it in the Library.
5. Update its reading progress, leave the app, return, and check whether the change remains.
6. Find a useful study tool, such as flashcards or the timer, without being told where it is.
7. Find where to change an upcoming reminder or another study preference, if available.
8. Explain whether your study data is saved on this device, synced, or unclear.
9. Find the Afaan Oromoo label, if present, and explain what it means.

Do not guide the student immediately. Note where they hesitate, choose the wrong place, or expect something different.

### Record observations

For each task, record:

| Task | Finished without help? | Where did they hesitate? | Wording or control that confused them | Notes |
|---|---|---|---|---|
|  | Yes / Partly / No |  |  |  |

After the tasks, ask:

- What felt easiest?
- What felt hardest to find?
- Was anything unnecessary or distracting?
- What would you expect to see on Home?
- What would you keep only in the Library or a menu?
- What is one change that would help you study more easily?

Do not treat a student's preference as proof by itself. Look for repeated confusion across students, and balance it with the project's purpose and accessibility needs.

## 7. Feature regression checklist

Use this checklist after relevant code changes. Mark **Pass**, **Fail**, **Not tested**, or **Not applicable** and record the device, browser, date, and any issue. Source code existing is not evidence that a feature works.

| Area | Check | Result / notes |
|---|---|---|
| Startup and data safety | Existing materials and tips load after refresh; an intentionally empty collection remains empty. | Not tested |
| Account isolation | Signing into another test account does not show the previous account's library or profile. | Not tested |
| Library | Add, edit, search, filter, sort, and delete a material; confirm counts and open details stay correct. | Not tested |
| Reading progress | Change pages and status from each supported screen; confirm progress stays within valid page limits and remains after reload. | Not tested |
| Attachments | Add, preview, download, and remove supported files; check rejected file types, large files, and interrupted reads show clear feedback. | Not tested |
| Flashcards | Open and close repeatedly; flip, navigate, rate, revise a rating, and confirm unanswered cards are not silently skipped. | Not tested |
| Quiz | Check a successful AI response, malformed response, network failure, and unavailable AI; a failure must not appear as a genuine AI-generated quiz. | Not tested |
| Timer | Start, pause, reset, switch focus/break, reload, and check behavior after the app was in the background. | Not tested |
| Daily goal and reminders | Change progress, complete a goal, reload, and confirm displayed counts and reminders are understandable. | Not tested |
| Calendar | Add, complete, and delete an event; switch test accounts on the same device and check events do not leak across accounts. | Not tested |
| Study tips and profile | Add or react to a tip; test profile save success and failure messages. | Not tested |
| Backup | Export, import into test data, handle duplicate IDs, and verify cancellation does not change existing data. | Not tested |
| Cloud sync | Test only after the correct migration is applied to a test project; try two accounts, two devices, offline edits, deletion, and conflict resolution. | Not tested |
| Mobile and accessibility | Test narrow screens, keyboard visibility, tap targets, focus, dialog close behavior, and readable text. | Not tested |
| Simple language | Ask a student to complete the main tasks without explanation and identify confusing English or Oromo wording. | Not tested |

## 8. Quality gate for each change

Before calling a change complete:

1. State the user problem it solves and which audience it serves.
2. Keep the change focused; avoid mixing unrelated features into the same change.
3. Check loading, empty, success, failure, and cancellation states that apply.
4. Run the relevant project checks, including `npm run lint` and `npm run build` when source code changes.
5. Manually test the changed user journey on a small screen when it affects the interface.
6. Review the final diff and confirm no unrelated files, secrets, or generated build output were included.
7. Record what was tested and what remains unverified. Never mark a database migration or cloud behavior as tested until it has actually been exercised safely.

## 9. Future feature decision checklist

Before adding a feature, ask:

- Does it directly help a student study, read, plan, or continue?
- Does it make Home or the Library clearer, or does it add another competing destination?
- Can an existing feature solve the same problem with less complexity?
- Is it understandable in simple English and, where useful, Afaan Oromoo?
- Does it work well on a basic phone and a slow or unreliable connection?
- What student data does it collect or store? Can the feature work with less data?
- How will a student know whether information is local or synced?
- What happens when saving, syncing, permissions, or the network fail?
- How will we test whether students actually find it useful?

If the benefit is unclear, keep the idea in a future list rather than adding it to the main experience.

## 10. Current scope and honest status

FacheeBook has source code for a study library and multiple study-support tools. This document is a plan and test guide, not confirmation that each workflow passes testing.

The current project notes describe materials and study tips as cloud-sync candidates; attachments and other study data may have different storage behavior. Verify the actual implementation and Supabase setup before promising cross-device sync. Never describe a feature as tested, reliable, secure, or release-ready without evidence from the relevant checks.
