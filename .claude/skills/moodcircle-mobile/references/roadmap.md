# Roadmap

Status on 2026-09-30: **Phases 0 and 1 are built, then the app was rebuilt from the Moodbloom design canvas** (account
screens, Home, Log a mood, Insights, Profile). All of it is merged into `main`, together with the personal entries API it
needs (`/api/entries`) and the skill itself (PR #7). The canvas is a personal tracker with no groups, so Phase 2 below
(groups and feed) starts only when the user says go. Nothing has run on an iPhone.

## Contents
- Phases
- Decisions taken so far
- Phase 0: scaffold procedure (used; re-run only for a fresh project)
- Feature map (web to native)
- Web behaviour to fix, not port
- Backend work
- App Store requirements to plan for
- Open decisions

## Phases

Each phase is one or more small PRs off `main`, branch `feature/mobile-<slice>` (naming rule in `CLAUDE.md`), each finishing with the gates in
`testing-and-verification.md`. Do not start a phase without the previous one merged, and do not mix backend changes into
an app PR.

| Phase | Goal | Ships |
|---|---|---|
| 0 Scaffold **(built)** | An empty app that builds, lints, tests, exports, and gates three placeholder groups | Expo project in `mobile/`, templates copied, gates green. The CI workflow is still open (recommended, ask first) |
| 1 Sign in **(built)** | A user can sign in, set up a profile, and stay signed in | sign-in (code and password on one screen), verify, quick-login password sheet, profile setup, joy setup; flows `auth` and `auth-returning`; a placeholder Home with Sign out. Still to do from the original list: joy **edit** and profile edit (they live on the Me tab, Phase 3) and the `session-resilience` flow (it needs an authenticated screen, so it lands with the Home feed in Phase 2) |
| 1b Moodbloom canvas **(built)** | The personal mood tracker from the design canvas | account screens redone to the canvas; Home (one-tap check-in, today's list), Log a mood (strength, tags, note, edit an entry), Insights (week or month, bubbles, week dots, balance score), Profile (totals, daily reminder, edit name, Log out); entries on the server (`/api/entries`). Left out: soundscapes and music player, Apple/Google sign-in, dark mode, privacy and passcode, export, help. Not built or run: flows for the new screens (`auth` only needed its Home marker), `contract-check` for `/entries` |
| 2 Groups and feed | The daily loop works | group setup (create, join), group switcher, Home feed (vibe row, member dots, streak pill, mood cards), check-in sheet, reactions, nudge, mind-divert |
| 3 Insight | The rest of the tabs | History (7/30/90 days, chart, stats, share), Streak (real 28-day calendar), Me (edit profile, joy list, invite code, sign out, set password) |
| 4 Ship | TestFlight, then the store | `eas.json`, icon and splash, push for nudges, daily local reminder, crash reporting, privacy policy, account deletion, report and block, TestFlight build |
| Later | | home-screen widget (needs a Swift extension and a development build), dark mode, offline cache, Apple In-App Purchase for premium, Android release, iPad layout |

## Decisions taken so far

Made while building Phases 0 and 1 (the user said "start", not "ask me first"), each with the reason so it can be overruled:

| Decision | Choice | Why |
|---|---|---|
| App name, bundle id | `MoodCircle`, **placeholder** `com.example.moodcircle` | Cannot be settled without the user's domain. It is harmless for Expo Go and web checks, but must become the real id before the first EAS build or TestFlight upload |
| Profile setup Skip | **None**: a display name is required, the username stays optional | Friends see names in the feed, and a skipped setup used to come back at every launch on the web |
| Code and password sign-in | One screen with a toggle ("Sign in with password instead" / "Use OTP instead"), not a separate `password` route | Same as the web; one fewer route, and the email typed is kept when switching |
| Post-sign-in prompts | A non-persisted queue in `ui-store` (`joy` first, then `password`); `(app)/_layout.tsx` opens the next one about 400 ms after it appears; each prompt screen dismisses itself on unmount | Joy and the password offer can both be due after a first sign-up; a queue keeps the order and never repeats one after a reload |
| Who is offered what | Joy: only after first profile setup. Password offer: after a code sign-in when the account has no password. Never on a password login | Joy is a continuation of first setup, never a gate: a returning user's login must go straight to Home (the web's login-hijack bug) |
| Errors | Inline, above the button or under the field, in `accents.danger` with `accessibilityRole="alert"`; never an alert dialog. Network wording is kept, 5xx becomes a generic "server trouble", 4xx shows the backend message | Users keep what they typed and can retry (`utils/error-message.ts`) |
| Touch targets | 46 pt text fields, 48 pt buttons, 34 pt icon buttons with `hitSlop` 6 (text links 10) | Apple's guideline is 44 pt; padding-based web sizes are not guaranteed to reach it |
| Helper text colour | `textSecondary`, not the web's `textTertiary` | `textTertiary` is 2.3:1 and fails contrast for text people must read |
| Light only | `userInterfaceStyle: "light"` | No dark palette exists yet |

## Phase 0: scaffold procedure

For a brand-new project only (Phase 0 is done for this repo; do not re-run it over `mobile/`). The whole procedure was run as
written, from an empty directory, against SDK 57 on 2026-09-29 (type-check, lint, 37 tests, `expo install --check` and the
scaffold flow all green; `expo-doctor` 19 of 21, the two others need blocked hosts).

1. From the repo root: `npx create-expo-app@latest mobile --template default --no-install --no-agents-md --yes`.
   `--no-agents-md` skips the template's `AGENTS.md` and its `.claude/settings.json` (which would enable Expo's plugin without
   asking). Inside an existing repo it does not create a nested `.git`; check with `test ! -e mobile/.git`. Then
   `cd mobile && npm install`.
2. Clear the demo code: `rm -rf src scripts`, `npm pkg delete scripts.reset-project`, delete `README.md` and `LICENSE`, and the
   unused images in `assets/` (keep the icon and splash files until real ones exist). Do NOT use `npm run reset-project`: it
   writes a `src/app/index.tsx` that survives as an unguarded `/` route next to `(app)/index.tsx`. The dry run showed the gate
   silently bypassed while a plain "page has text" check still passed. Add a short `mobile/AGENTS.md` that points at
   `.claude/skills/moodcircle-mobile/SKILL.md`.
3. Copy the verified templates and config (see `architecture.md`, "Templates").
4. Dependencies (this order and these flags were run as written):
   ```bash
   npx expo install expo-secure-store expo-network react-native-svg
   npx expo install --dev jest-expo eslint eslint-config-expo
   npm i @tanstack/react-query zustand zod @expo-google-fonts/fraunces @expo-google-fonts/dm-sans
   npm i -D prettier eslint-plugin-prettier eslint-config-prettier jest@^29.7.0 @types/jest@^29.5.14 @testing-library/react-native
   ```
   `expo install --dev` is what keeps tooling out of `dependencies`. Install ESLint explicitly: `expo lint` only auto-installs
   it when no `eslint.config.js` exists, and step 3 has already copied ours (without the packages it fails with "Cannot find
   module 'eslint-config-expo/flat'"). The template ships NO test tooling (its devDependencies are only `@types/react` and
   `typescript`), and Jest must stay on 29 because `jest-expo` 57 is built on it (npm's `latest` is Jest 30). Then remove what the
   demo used and we do not: grep first, then `npm uninstall` (`expo-glass-effect`, `expo-device`, `expo-web-browser`,
   `expo-symbols`, `@expo/ui` unless a slice wants them). Keep Expo Router's peers.
5. `app.json`: name, slug, scheme, `ios.bundleIdentifier` (ask), `userInterfaceStyle: "light"`, `web.output: "single"`,
   `experiments.typedRoutes` and `reactCompiler` true (`stack-and-versions.md`). In `package.json`: `"jest": { "preset": "jest-expo" }` and
   a `"test": "jest"` script.
6. Routes: step 3 already brought the root `_layout.tsx` and, in each of `(auth)`, `(onboarding)`, `(app)`, a plain `Stack`
   `_layout.tsx` plus a static placeholder screen (`sign-in`, `profile`, `index`) so the gate compiles. Phases 1 and 2 replace
   the placeholders; each one says so in a comment.
7. `node ../.claude/skills/moodcircle-mobile/scripts/typegen.mjs .`, then `npx expo lint --fix` once so the tree is formatted,
   then all gates, and `verify-web.mjs --project . --flow ../.claude/skills/moodcircle-mobile/scripts/flows/scaffold-check.mjs`
   (it fails if anything renders outside the auth gate). It is only meaningful while the routes are placeholders: it is not
   copied into `mobile/`, and it correctly fails against the built app, which has real screens.
8. Update the "Status" lines at the top of `SKILL.md` and this file. Commit in small logical commits, push
   `feature/mobile-scaffold`. Open a PR only when asked.

Also in Phase 0 (recommended, ask first): `.github/workflows/mobile.yml` running `npm ci`, `scripts/typegen.mjs`, `tsc`,
`expo lint`, `jest` on pull requests that touch `mobile/`. The repo has no CI today.

## Feature map (web to native)

The web source is `public/js/*.js` (about 1,200 lines) and `public/index.html`; read the module before porting. Behaviour
that must carry over, with the endpoints (details in `api-contract.md`):

| Feature | Web source | Native route | Behaviour to keep |
|---|---|---|---|
| Sign in with a code **(built)** | `auth.js` | `(auth)/sign-in`, `(auth)/verify` | email in, 6 boxes out, resend; the email is trimmed and lower-cased; never auto-fill from the response |
| Sign in with a password **(built)** | `auth.js` | a toggle on `(auth)/sign-in`, no separate route | a wrong password stays on the screen with a message and keeps the fields; never signs out |
| Quick-login password **(built)** | `auth.js` (`openPwSheet`) | `(app)/set-password` sheet | queued at code verify when `hasPassword` is false, opened about 400 ms after Home appears (after joy, when both are due); skippable |
| Profile setup **(built)** | `onboarding.js` | `(onboarding)/profile` | display name required, username optional (3+ chars, letters digits underscore, lower-cased as typed, `USERNAME_TAKEN` shown inline), emoji avatar from 18 options; no Skip (decided) |
| Things that make me feel good **(built)** | `onboarding.js` | `(app)/joy` modal | 12 suggestion chips plus custom entries, max 12, saving (even empty) sets `joyOnboarded`; shown right after first-time profile setup, never on plain login. Editing it later from the Me tab reuses the same screen (Phase 3) |
| Create or join a group | `groups.js`, `index.html` `s-setup` | `group-setup` | name up to 60; invite code is 6 chars, upper-cased as typed; also the empty state when the user has no group |
| Switch group | `groups.js` | `group-switcher` sheet | offered only with 2+ groups; the active group is remembered |
| Home feed | `feed.js` | `(tabs)/index` | three requests in parallel (today, streak, group); vibe score with label (4.5+ Amazing, 3.5+ Good, 2.5+ Mixed, 1.5+ Rough, else Tough), member dots (up to 6, pending dots), "X of Y checked in", streak pill only when streak > 0, check-in bar until the user has posted, mood cards, "History" link |
| Check in | `feed.js` (`openSheet`) | `check-in` sheet | header "<group> · today"; five mood tiles; note up to 280; an anonymous toggle; a toggle that reveals a private note up to 500 (never shown back); one per group per IST day. The web only hides its banner after posting, so the "+" still opens a form that fails with 409: the native sheet must show "already checked in" instead. Success closes the sheet, shows "Mood posted", reloads the feed |
| Reactions | `feed.js` | on the mood card | a toggle per type (POST to add, DELETE with the stored reaction id to remove); own reactions highlighted, a count per type; the web shows sending_love, same, rooting_for_you |
| Nudge | `feed.js` | on the mood card | on every other person's non-anonymous card; the label is "Send support" (blue) for Rough or Low posts and "Nudge" otherwise; one per person per day; after sending it reads "Nudged" and is disabled, with a toast |
| Mind-divert | `feed.js` | `mind-divert` sheet | after posting level 1 or 2, about 400 ms later; suggests one of the user's joy activities, else one of eight grounding tasks; "another idea" never repeats the last; joy users can switch to a grounding reset; dismiss the toast first |
| History | `history.js` | `(tabs)/history` | 7/30/90 day tabs; bar chart of daily averages; Happiness Index = round(mean of daily means / 5 x 100); stat tiles; Share the index |
| Streak | `streak.js` | `(tabs)/streak` | number, "Checked in today" message, 28-day calendar, stat tiles |
| Me | `account.js` | `(tabs)/me` | avatar, name, `@username` or email, plan tag, menu: edit profile, joy list, invite code (copy), streak, create or join another group, set or change password, sign out |

The eight grounding tasks (`GROUNDING_TASKS` in `feed.js`) and the twelve joy suggestions (`JOY_SUGGESTIONS` in
`onboarding.js`) are product content: copy them into a constants module, do not retype them.

## Web behaviour to fix, not port

These are bugs or leftovers in the web app. Decide with the user, and do not reproduce them by accident.

- **History mixes group and personal data.** The Happiness Index, "Days checked in" and "Total check-ins" are computed over
  the WHOLE group's history, while "Current streak" is personal, and the share text says "My MoodCircle happiness index".
  Decide: personal index (filter `isOwn`), group index, or both, and word the share text to match.
- **"Best streak" shows the current streak.** The API has no best streak.
- **The 28-day calendar is a guess** (it colours the last N days from the streak count, not real check-ins). Build it from
  `GET .../moods/history?days=30` filtered to `isOwn`.
- **Member dots show "?"** because they read the removed `phone` field. Use name initials.
- **Off-palette colours** survive in the streak, stat and nudge widgets (see `design-system.md`).
- **Copy says both "circle" and "group".** Pick one for the app.
- **A skipped profile setup returns at every launch** (there is no stored flag) until a name exists.

## Backend work

Separate PRs, each followed by `contract-check.mjs`. Priority order:

| # | Change | Why | Notes |
|---|---|---|---|
| B1 | Longer sessions | JWTs last 7 days with no refresh, so a phone user is signed out weekly | env only: set `JWT_EXPIRES_IN` (for example 60d) on the server; refresh tokens later if needed |
| B2 | Gate the OTP echo with its own flag | `POST /auth/otp/request` returns the code whenever `NODE_ENV` is not `production`; one missing env var on the server leaks every code | for example `EXPOSE_DEV_OTP=1`; then set it in `scripts/lib/backend.mjs` |
| B3 | OTP attempt limit and request rate limit | a 6-digit code lives 10 minutes with unlimited guesses | before any public release |
| B4 | Streak decay and best streak | `currentStreak` is not reset on read; there is no best streak | return 0 when `lastCheckInDate` is older than yesterday IST |
| B5 | Push for nudges | nudges are stored and never delivered | device-token table plus `POST /devices`, send through Expo's push service when a nudge is created, `GET /nudges/me` inbox |
| B6 | Personal history | the app downloads the whole group to draw one person's graph | for example `?scope=me` |
| B7 | Account deletion | required by the App Store (below) | `DELETE /profile` removing the user, their moods, reactions, nudges, streak |
| B8 | Report and block | user-generated content between users (below) | minimal: report a mood card, block a user's cards |
| B9 | Apple In-App Purchase | premium currently uses Razorpay, and selling digital features inside an iOS app must use IAP | only if premium ships in the app; otherwise hide premium on iOS |
| B10 | CORS allow-list | only if a web build is ever deployed | not needed for native |

## App Store requirements to plan for

From memory of App Store Review Guidelines; **verify the current text at submission** (developer.apple.com may be blocked in
the sandbox, so the user may need to check):
- An app that lets people create an account must let them delete it inside the app (5.1.1(v)). This is B7.
- Apps with user-generated content need a way to report objectionable content, block abusive users, and filter or
  moderate (1.2). Notes shared inside friend groups count. This is B8.
- A privacy policy URL, and App Privacy answers describing data collected (email, name, mood entries, notes).
- Email-code sign-in alone does not trigger the "Sign in with Apple" requirement; adding Google or Facebook login would.
- Selling premium inside the app needs In-App Purchase (B9).
- Mood notes are sensitive personal data: say what is stored, and never log it.

## Open decisions

Ask these before the phase that needs them; each has a recommendation so the user can just say yes.

1. **Tab bar.** Custom JS tab bar with the centre "+" (matches the reference the user chose; recommended) versus native tabs
   with a Check in button on Home (more iOS-native, cannot draw a centre button). Cheap to switch later (`architecture.md`).
2. **Hardware and accounts.** Do they have a Mac and an Apple Developer Program membership (paid, yearly)? SDK 57 in Expo Go
   on a physical iPhone needs a matching Expo Go build, which Expo's docs say the App Store does not carry
   (`testing-and-verification.md`): the options are `eas go` (membership), `sign.expo.dev`, a Mac simulator, or moving to
   SDK 54. TestFlight and the store need the membership anyway. Android in scope?
3. **App name and iOS bundle identifier.** For example `com.<their domain>.moodcircle`. Phases 0 and 1 went ahead with the
   name `MoodCircle` and the placeholder `com.example.moodcircle`; the real id blocks the first EAS build.
4. **Production API URL.** Must be HTTPS (iOS blocks plain HTTP by default). Is the cPanel deployment reachable over HTTPS, and
   at what base path?
5. **Dark mode.** Light only (recommended until a dark palette is designed) or design one now.
6. **Profile Skip.** Taken: a display name is required (friends see names in the feed). Tell the user and reverse it if they
   want the web's Skip back.
7. **Reactions.** The three the web offers (recommended for parity) or all five the backend accepts.
8. **History semantics.** Personal, group, or both (see "Web behaviour to fix").
9. **Off-palette colours.** Keep the streak orange and support blue, replace the error red with the darker shade
   (`design-system.md`), drop the rest? Recommended as written there.
10. **Notifications.** Nudge push (needs B5) and an optional daily reminder time.
11. **Official Expo plugin.** Expo publishes `expo@claude-plugins-official` (skills for router, data fetching, native UI,
    EAS and upgrades, plus an MCP server and hooks). It can be enabled per repo in `.claude/settings.json`. It is optional:
    this skill stands alone. Enabling installs third-party plugin components, so ask first.
