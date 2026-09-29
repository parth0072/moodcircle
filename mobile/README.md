# MoodCircle mobile

The React Native (Expo SDK 57) app for MoodCircle. It talks to the same API as the website.

## Run it on your iPhone (no Mac needed)

1. Install **Expo Go** from the App Store.
2. On your computer:

   ```bash
   cd mobile
   cp .env.example .env     # then set EXPO_PUBLIC_API_URL inside it
   npm install
   npx expo start
   ```

3. Scan the QR code with the iPhone camera (same Wi-Fi as the computer).

`EXPO_PUBLIC_API_URL` must be an address the phone can reach, including `/api` and the
base path if the server uses one: the deployed HTTPS URL (for example
`https://your-domain/moodcircle/api`) or your computer's Wi-Fi address
(`http://192.168.x.x:3000/api`). Never `localhost`: on a phone that means the phone itself.

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
