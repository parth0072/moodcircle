# MoodCircle mobile

The React Native (Expo SDK 57) app for MoodCircle. It talks to the same API as the website.

## Run it on your iPhone

You need a computer with Node.js 22.13 or newer, and the iPhone on the same Wi-Fi.

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
   cp .env.example .env     # Windows: copy .env.example .env. Then set EXPO_PUBLIC_API_URL inside it
   npm install
   npx expo start
   ```

4. Scan the QR code with the iPhone **Camera** app and tap the banner to open Expo Go.

`EXPO_PUBLIC_API_URL` must be an address the phone can reach, including `/api` and the
base path if the server uses one: the deployed HTTPS URL (for example
`https://your-domain/moodcircle/api`) or your computer's Wi-Fi address
(`http://192.168.x.x:3000/api`). Never `localhost`: on a phone that means the phone itself. To check the address, open
`<that address>/health` in Safari on the iPhone: it must show `{"ok":true}`. After changing `.env`, restart with
`npx expo start --clear`. The sign-in code is emailed by the server; if the server has no email set up, it prints
`[OTP] ...` in its log instead.

## What works today

Sign up and sign in with an emailed code or a password, profile setup (name, username, avatar), "what makes you feel good",
and the quick-login password offer. After that you land on a placeholder Home with a Sign out button: groups, the mood feed,
check-in and the other tabs are the next slices. None of it has been run on a real iPhone yet.

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
```

## Notes

- The iOS bundle identifier in `app.json` is a placeholder (`com.example.moodcircle`).
  Change it before the first iPhone build.
- The app icon and splash image are still Expo's placeholders.
- Architecture, pinned versions, conventions and verification tools:
  `.claude/skills/moodcircle-mobile/SKILL.md` (at the repository root).
