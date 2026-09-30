# MoodCircle mobile

The React Native (Expo SDK 57) app for MoodCircle. It talks to the same API as the website.

## Run it on your Mac (one command)

From the project folder (the one above `mobile/`):

```bash
git fetch origin && git checkout main && git pull
bash run-mobile.sh
```

The script checks Node.js and Xcode (and offers to install or set up what is missing), installs the dependencies, and opens
the app in the iOS Simulator. The app talks to your live server, the address in `mobile/.env.development`
(`https://api.alphabyteinnovation.com/moodcircle/api`). The script checks that server first and warns if it has not been
updated with the mood entries yet: deploy the latest `main` there with `deploy.sh`. Ctrl+C stops everything.

Other options: `--local` (a throwaway test server on this Mac instead: it sends no emails, and the sign-in code is printed in
the terminal as `>>> Sign-in code: 123456`), `--api https://other-server/api` (another server), `--phone` (iPhone with Expo
Go, see below), `--reset` (with `--local`: empty the test database to see sign-up again), `--help`.

## Run it on your iPhone

`bash run-mobile.sh --phone` does the steps below for you (it still needs the Expo sign-in and a matching Expo Go). You need
a computer with Node.js 22.13 or newer, and the iPhone on the same Wi-Fi.

1. **Have an Expo Go that opens SDK 57 projects.** Expo's docs say the App Store version of Expo Go is stuck on
   SDK 54 (SDK 55 and later are not published there), so it may refuse this app with
   "Project is incompatible with this version of Expo Go". Try the App Store version first. If you see that message,
   use one of these instead:
   - `npx eas-cli@latest go` builds Expo Go for this SDK into your own TestFlight (needs the paid Apple Developer Program).
   - https://sign.expo.dev installs a matching Expo Go on the iPhone with your Apple ID (not tried from here: check what
     it asks for).
   - On a Mac, the iOS Simulator: run `npx expo start`, then press `i`.
2. **Sign in to Expo on both ends.** SDK 57 requires it for Expo Go on a physical iPhone, with the same free account
   (expo.dev/signup): run `npx expo login` on the computer, then tap the account icon (top right) in Expo Go.
3. On your computer:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

4. Scan the QR code with the iPhone **Camera** app and tap the banner to open Expo Go.

The app already points at your live server (`EXPO_PUBLIC_API_URL` in `.env.development`), which a phone can reach. To use
another server, put `EXPO_PUBLIC_API_URL=...` in `mobile/.env.local` (it is not in git; a value there wins). It must be an
address the phone can reach, including `/api` and the base path if the server uses one, for example your computer's Wi-Fi
address (`http://192.168.x.x:3000/api`). Never `localhost`: on a phone that means the phone itself. To check an address,
open `<that address>/health` in Safari on the iPhone: it must show `{"ok":true}`. After changing an env file, restart with
`npx expo start --clear`. The sign-in code is emailed by the server; if the server has no email set up, it prints
`[OTP] ...` in its log instead.

## Get an Android APK from GitHub

The GitHub Action **Android APK** (`.github/workflows/android-apk.yml`) builds an app file you can install on an Android
phone or emulator. You need nothing on your computer.

**To install it, or share it with someone**, open the newest release on the
[Releases page](https://github.com/parth0072/moodcircle/releases/latest) on the Android phone (no GitHub login; it is
public, like the repository), tap the `.apk` under *Assets*, then open the downloaded file. If the phone asks, allow
installs from the browser. A release made by the workflow names its file `moodcircle.apk`, so
https://github.com/parth0072/moodcircle/releases/latest/download/moodcircle.apk downloads the newest one in a single tap.

**To publish a new release**, tag a commit on `main` with the next version and push the tag:

```bash
git checkout main && git pull
git tag 1.1
git push origin 1.1
```

(Or make the release on GitHub, which makes the tag for you.) About 20 minutes later the workflow adds `moodcircle.apk` to
that release, or makes the release if there is none yet. The tag becomes the version Android shows (`1.1` and `v1.1` both
give 1.1), and every build has a higher version number, so a newer APK installs over an older one. A tag has to be a
version: a number, or `v` and a number, such as `1.1`, `1.1.0` or `v1.1.0`.

To try a build without releasing it (another branch, or another server), open the **Actions** tab on GitHub, choose
**Android APK**, then **Run workflow**. Open the run and download **moodcircle-android-N** under *Artifacts* at the bottom
(a zip with one `.apk` inside; that download needs a GitHub login).

The app talks to the server in `mobile/.env.production` (the live server). To try another server, type its address into
*Run workflow* (for example `https://your-domain/moodcircle/api`; it must be `https`, because Android blocks plain `http`).

It is signed with the debug key Expo makes, which is fine for your own devices but **not for the Play Store**. Publishing
needs a release key and an app bundle (`.aab`); the package id is `com.alphabyteinnovation.moodcircle` (`android.package`
in `app.json`), which cannot change once the app is on the Play Store. Nothing has been checked on a real Android phone
yet: layouts, keyboard behaviour and the daily reminder (Android asks permission for notifications on first use) are worth a
look.

## What works today

The screens follow the **Moodbloom** design canvas (Claude Design, "Moodbloom – Mood Tracking App"):

- **Account:** the intro slides (shown once), Welcome, Sign up (with the emailed code), Log in with a password, and
  Forgot password (emailed code, then a new password).
- **Home:** greeting, six emotion buttons (one tap logs how today feels, tap again to undo, tap another to correct it),
  and today's check-ins.
- **Log a mood:** emotion, how strong, tags and a note; also opens an existing entry to add details.
- **Insights:** Week or Month, bubbles sized by how often each emotion showed up, the last seven days, and a balance score.
- **Profile:** your totals (streak, check-ins, top mood), the daily 8:30 pm reminder, edit name, Log out.
- **Groups** (the people button on Home): "Your circles" lists your groups, who is in each, how they feel today and a
  badge for new posts. *Start a group* (name, colour, what members can see) and its invite opens in the share sheet.
  *Join with code* shows whose group it is first ("Group found") and lets you choose whether your daily mood is shared
  with it automatically. Inside a group you see how everyone feels right now and today's posts, can send a hug, and can
  share your own mood, with a few words, to one or several groups.

Entries and groups are stored on the server (`/api/entries` and the group routes), so the live server must be deployed
from the latest `main`; `bash run-mobile.sh --local` starts a test server that already has them. Left out on purpose:
the design's soundscapes and music player, Apple/Google sign-in (the server has neither), dark mode, replying to a post,
approving new members (joining with a code is instant), and leaving a group. None of it has been run on a real iPhone yet.

Group posts made on the website have five levels, not six emotions: in the app they show as the closest emotion
(Great as Joy, Good as Calm, Okay as Meh, Low as Worry, Rough as Sad).

## Checks

```bash
npm run typecheck   # run `npx expo start` once first so the route types exist
npm run lint        # add -- --fix to format
npm test
```

Screens can also be exercised in a headless browser against a throwaway copy of the real backend (a web export, not the
iOS renderer):

```bash
node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/auth.mjs
node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/groups.mjs
```

## Notes

- The iOS bundle identifier in `app.json` is a placeholder (`com.example.moodcircle`).
  Change it before the first iPhone build.
- The app icon and splash image are still Expo's placeholders.
- Architecture, pinned versions, conventions and verification tools:
  `.claude/skills/moodcircle-mobile/SKILL.md` (at the repository root).
