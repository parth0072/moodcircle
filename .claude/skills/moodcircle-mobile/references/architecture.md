# Architecture

The layout follows Expo's own guidance (the `expo-project-structure`, `expo-router` and
`expo-data-fetching` skills, and the `create-expo-app` template). It adds only what those leave
open for us: an `api/` boundary, `stores/`, and `theme/`. Where we deliberately differ from Expo's
advice, the section says so and why.

The app lives in `mobile/src` and is the source of truth from Phase 1 on: reuse its components, hooks and screens before
writing new ones. The verified Phase 0 seed is in `assets/` for a fresh scaffold only: see "Templates" at the end.

## Contents
- Principles
- Folder layout
- Layering rules
- Routing and the auth gate
- Session and API client
- Server state
- Screens, forms and mutations
- Expo and React Native conventions we follow
- Accessibility, performance, security
- Definition of done for a screen
- Templates

## Principles

1. **Small single-purpose files.** The user asked for this explicitly, and the web app was once one
   4,000-line `index.html` that had to be split. One component per file, one resource per API module.
2. **Routes are thin.** A file in `src/app` reads params, picks a layout, and renders a screen.
3. **One direction of dependencies.** UI depends on hooks, hooks on the API, the API on utilities.
   Never the reverse; cycles are bugs.
4. **The server owns the truth.** "Today", "checked in", the vibe score and reactions come from the API.
   The client caches and displays; it does not recompute.
5. **Failures are states, not exceptions.** Every data screen has loading, error, empty and content.
   A network error is never a sign-out.

## Folder layout

```
mobile/
├── app.json  eas.json  package.json  tsconfig.json  eslint.config.js  .prettierrc  .env.example
├── .env.development  .env.production   (committed: the live server address; a personal .env.local overrides)
├── assets/                    icon, splash, images (fonts come from @expo-google-fonts)
└── src/
    ├── app/                   ROUTES ONLY. Nothing else, ever (tests, types and helpers would become routes)
    │   ├── _layout.tsx        providers, fonts + session hydration gate, Stack.Protected
    │   ├── (auth)/            sign-in (code or password, one screen with a toggle), verify (code)      [built]
    │   ├── (onboarding)/      profile (name, username, avatar)                                          [built]
    │   └── (app)/             a Stack today; Phase 2 adds (tabs)
    │       ├── index.tsx      placeholder Home until Phase 2 (shows the user and a Sign out button)     [built]
    │       ├── joy.tsx        modal: "things that make me feel good" (onboarding continuation; edit later) [built]
    │       ├── set-password.tsx    formSheet: quick-login password offer                                 [built]
    │       ├── (tabs)/        index (Home feed), history, streak, me   + custom tab bar with the centre "+"
    │       ├── check-in.tsx   formSheet: post a mood (the centre "+" opens it)
    │       ├── mind-divert.tsx  formSheet: low-mood suggestions from the user's joy list
    │       ├── group-switcher.tsx  formSheet: pick the active group (only offered with 2+ groups)
    │       ├── group-setup.tsx     create or join a group (also the empty state of Home)
    │       ├── group/[id].tsx      group detail: members, invite code, leave
    │       └── edit-profile.tsx    name, username, avatar
    ├── screens/               screen bodies, one folder per screen; private pieces live inside it
    │   ├── sign-in/ verify/ set-password/ profile-setup/ joy-setup/     [built; each has index.tsx + index.test.tsx]
    │   └── home/{index.tsx, feed-card.tsx, vibe-summary.tsx, ...}       [Phase 2]
    ├── components/            shared UI used by 2+ screens
    │   │                      built: app-text, button, text-button, icon-button, text-field, otp-input, chip, screen, icon, mood-face
    │   └──                    to come: mood-picker, avatar, mood-tab-bar, toast, empty/error state ...
    ├── api/                   the only code that talks HTTP
    │   ├── client.ts errors.ts parse.ts query-client.ts index.ts        (templates)
    │   ├── schemas/           zod per resource, all templates: auth, user, group, mood, nudge, streak
    │   └── <resource>.ts      request functions only. Built: auth, profile. To come: groups, moods, reactions, nudges, streaks
    ├── hooks/                 TanStack Query wrappers + key factories. Built: use-auth, use-profile.
    │                          To come: use-groups, use-today-feed, use-post-mood ...
    ├── stores/                session-store.ts (template), ui-store.ts (non-persisted: the post-sign-in prompt queue; active group in Phase 2)
    ├── constants/             product content copied from the web, not retyped: avatars, joy-suggestions (grounding tasks in Phase 2)
    ├── test-utils/            renderScreen (SafeAreaProvider + QueryClient), createQueryWrapper: shared by tests, never imported by app code
    ├── theme/                 colors, spacing, radius, typography (templates, extended with roles); ONE entry point
    └── utils/                 env, ist-date, secure-storage(.web) (templates), error-message, plus pure helpers
```

Naming and files:
- kebab-case for every file (`feed-card.tsx`), named exports for components, default export only for routes.
- Colocate tests as `thing.test.ts(x)` next to `thing.ts(x)`, never inside `src/app`.
- `StyleSheet.create` at the bottom of the component file. No `.styles.ts` files.
- Import through the `@/` alias, not `../../..`.
- No barrel files except `theme/index.ts` (barrels hide cycles and defeat tree-shaking).
- Platform variants use `.web.ts(x)`, `.ios.ts(x)`, `.android.ts(x)` with an identical API and a plain default file
  (`secure-storage.ts` / `secure-storage.web.ts` is the model). Not inside `src/app`.
- Use `process.env.EXPO_OS` rather than `Platform.OS` (Expo's convention; it is inlined at build time).
- Promote a component from `screens/<name>/` to `components/` only when a second screen needs it and it has a
  nameable role. Do not extract speculatively.

## Layering rules

| Layer | May import | Must not |
|---|---|---|
| `app/*` | screens, components, stores, hooks, theme | contain logic beyond params and layout options |
| `screens/*` | components, hooks, stores, theme, utils, `api/schemas` (types) | call `api` directly |
| `components/*` | theme, utils, generic hooks | import `api`, `stores`, `screens`, or navigate |
| `hooks/*` | `api`, stores, utils | render anything |
| `api/*` | utils; `api/index.ts` alone also the session store | import React components |
| `stores/*` | utils, `api/schemas` (types only) | import `api` at runtime |
| `theme`, `utils` | nothing from the app | (they are leaves) |

Components that need data receive it as props from a screen. This is what makes them testable and
reusable, and it keeps `expo-router` out of the design system.

## Routing and the auth gate

`assets/src/app/_layout.tsx` is the tested root. It holds the splash screen until fonts and the persisted
session are ready, then gates three groups with `Stack.Protected`:

| `selectStatus` | Group shown | Meaning |
|---|---|---|
| `signedOut` | `(auth)` | no token, or storage unreadable |
| `needsProfile` | `(onboarding)` | signed in but no display `name` (the username is optional, as on the web) |
| `ready` | `(app)` | everything else |

Verified on the web export: cold start lands in `(auth)`; a signed-out deep link to a protected URL is
redirected; sign-in of a new account lands in `(onboarding)`; saving the profile flips to `(app)` with no manual
navigation; a reload with a stored session goes straight to `(app)`; sign-out returns to `(auth)`
(`scripts/flows/auth-gate.example.mjs`). Route groups do not appear in URLs, so `(onboarding)/profile` is `/profile`.

**Joy onboarding is a continuation, never a gate.** The web app once redirected every returning user into the
"things you love" screen because it checked `joyOnboarded === false` at login, which hijacked password
logins. So `joyOnboarded` must not appear in `selectStatus`. Instead the first-time profile save
(`useUpdateProfile({ firstSetup: true })`, only when `!joyOnboarded`) enqueues `'joy'` on a **prompt queue** in
`ui-store` (`Prompt = 'joy' | 'password'`, not persisted, joy before password), and a code sign-in enqueues
`'password'` when the account has no password (`useVerifyOtp`). The `(app)` layout opens the next prompt route about
400 ms after it appears, each prompt screen calls `dismissPrompt` when it unmounts (so the next one follows), and
`endSession()` clears the queue. A password login enqueues nothing, so a returning user lands on Home. Anyone can reopen
`/joy` later from the Me tab (Phase 3). Regression tests: `hooks/use-auth.test.tsx` (a password login queues nothing),
`screens/profile-setup/index.test.tsx` (joy only from first setup, never when already answered), `stores/ui-store.test.ts`
(order, once each, cleared on sign-out) and the `auth-returning` flow. Reintroducing the hijack was shown to fail them.

**Tabs.** Use JS tabs: `import { Tabs } from 'expo-router/js-tabs'` with a custom `tabBar` prop
(`import type { BottomTabBarProps } from 'expo-router/js-tabs'`), which is type-checked against SDK 57. Do not
import `Tabs` from the `expo-router` root (deprecated in SDK 57) and do not import `@react-navigation/*`
directly (Expo's SDK 56+ rule: use `expo-router/react-navigation`). The custom tab bar exists to draw the
Moodbloom centre "+" check-in button. This is a deliberate deviation: Expo's guidance prefers `NativeTabs`
(`expo-router/unstable-native-tabs`, unstable in SDK 57, stable in SDK 58) and discourages FAB-style buttons on
iOS, but native tab bars cannot render a centre action. Keep it swappable: the tab bar is one file
(`components/mood-tab-bar.tsx`) and check-in is its own route (`/check-in`), so switching to `NativeTabs`
with a Home button later touches no screen. See open decision 1 in `roadmap.md`.

**Sheets.** Present check-in, mind-divert and similar flows as routes with `presentation: 'formSheet'`,
`sheetAllowedDetents`, `sheetGrabberVisible` (type-checked in SDK 57), not custom modal components. Set an
opaque cream `contentStyle` background: Expo's transparent default gives iOS 26 "liquid glass", which would fight
the cream palette.

**Other route rules.** Every layout is a `_layout.tsx`; the app always has a route for `/`; delete old route
files when restructuring (typed routes turn stale `href`s into compile errors, verified). Prefer `<Link>`
over imperative navigation when there is a tappable element. Deep-link scheme: `moodcircle`.

## Session and API client

Copy `assets/src/api`, `stores/session-store.ts` and `utils/*`; do not reinvent them. What they guarantee
(each has a unit test, and the whole path was exercised against the real backend on the web export):

- **Envelope handling.** `{ success: true, data }` is unwrapped; `{ success: false, message, code }` becomes an
  `ApiError` with `kind: 'http'`, `status`, `code`.
- **Only a real 401 signs out.** The client calls `onUnauthorized` only when an authenticated request gets the
  backend's own `UNAUTHORIZED` envelope. Not for: a wrong password (`INVALID_CREDENTIALS` on sign-in, sent with
  `auth: false`), a bare 401 from a proxy, a network failure, a timeout, a 5xx, an HTML error page, or a 200 that
  is not the envelope. Those become `network`, `http` or `invalid-response` errors with a retry UI.
- **Stale answers cannot sign out a new session.** `onUnauthorized` receives the rejected token and
  `api/index.ts` ignores it if the current token differs.
- **Hydration.** `useSessionStore.hydrate()` reads the token and user snapshot before any routing decision
  (`hydrated` flag). A token without a readable user snapshot is discarded; unreadable storage starts signed
  out without wiping anything; a sign-in that finishes mid-hydration wins.
- **Merge, don't replace.** `GET /profile/me` and `PATCH /profile` omit `email` and `hasPassword`; call
  `mergeUser(patch)`.
- **`expo/fetch` is injected.** `createApiClient({ fetch })` takes any `FetchLike`; under `jest-expo`
  `expo/fetch` imports but performs no I/O, so tests pass a stub (see `client.test.ts`).
- **Env.** `EXPO_PUBLIC_API_URL` is read only in `utils/env.ts`, must be absolute on native, and is visible
  inside the app: no secrets. The value includes `/api` and any `BASE_PATH`.
- **Sign-out.** Always call `endSession()` from `@/api` (clears the store, storage and the query cache). Calling
  `signOut()` alone leaves the previous user's data in the cache.
- **Token storage.** `expo-secure-store` with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. iOS Keychain items survive an
  uninstall; if a reinstall must start signed out, add an install marker and wipe the keychain when it is missing.
  `secure-storage.web.ts` is `localStorage` and exists only so the web verification build runs.
- **Never** read or display `otp` from `POST /auth/otp/request` in app code. The backend returns it whenever
  `NODE_ENV` is not `production`; only `scripts/verify-web.mjs` uses it, through its own helper.

Resource modules (`api/groups.ts` etc.) are plain async functions that call `api.get/post/...` and pass the
result through `parseResponse(schema, data)`. Sign-in calls pass `{ auth: false }`.

## Server state

- **Query key factories** per resource, in the hook file:
  `groupKeys.list()`, `groupKeys.detail(id)`, `moodKeys.today(groupId)`, `moodKeys.history(groupId, days)`,
  `streakKeys.me()`. Keys start with the resource name so `invalidateQueries({ queryKey: moodKeys.all })` works.
- **Defaults** (`api/query-client.ts`): `staleTime` 30 s; retry at most twice, and only where trying again can help
  (network errors, unreadable answers, 5xx); 4xx and unexpected errors are final; mutations never retry. `setupQueryLifecycle()` (called in the root
  layout) maps `AppState` to `focusManager` and `expo-network` to `onlineManager`, so returning to the app
  refetches and offline pauses queries.
- **Invalidation after mutations**

  | Mutation | Invalidate |
  |---|---|
  | post mood | `moodKeys.today(groupId)`, `moodKeys.history(groupId, *)`, `streakKeys.me()` |
  | add/remove reaction | `moodKeys.today(groupId)` |
  | create/join/leave group | `groupKeys.list()` (and `detail(id)`); set/clear the active group |
  | update profile | `mergeUser(...)`, then `moodKeys.all` (names and avatars appear in feeds) |
  | nudge | nothing; disable the button on success and on `NUDGE_LIMIT` |

- **Active group** is client state (`ui-store`), persisted in secure storage under a tiny key; fall back to the
  first group when it is missing or no longer a member.
- Do not derive check-in state on the client. Use `checkedIn` and the current user's own item (`isOwn`) from
  `GET .../moods/today`. `utils/ist-date.ts` mirrors the backend's IST day rule but is only for chart axes and labels.

## Screens, forms and mutations

Rules from Expo's `expo-data-fetching` and `expo-native-ui` skills, which the web app's bugs also taught us:

- **Four states on every data screen**: loading (first fetch, skeleton or spinner), error (with Retry), empty
  (designed, with the next action), content. Loading is not empty; "No moods yet" must never flash while the first
  fetch runs. A failed refetch keeps showing cached content with a small inline retry.
- **Saves preserve work.** While a mutation is pending, disable resubmission. On failure keep the draft, show the
  error inline, and let the user retry. Close a sheet only after success. A failed post must not lose the note.
- **Server messages are user-safe**, and validation returns only the first error: show `error.message` for
  `VALIDATION_ERROR` and the known codes in `api-contract.md`; use a generic message for anything else.
- Controlled inputs with a zod schema for form validation (same library as the API boundary).
- Scrollable screens: FlatList as the root for feeds; otherwise `ScrollView` with
  `contentInsetAdjustmentBehavior="automatic"` (not `SafeAreaView`), `keyboardShouldPersistTaps="handled"` on
  forms. A primary action must never sit under the keyboard.
- Mind-divert (a Rough or Low check-in, level 1 or 2) opens about 400 ms after the post succeeds and dismisses any
  toast first. It suggests one of the user's joy activities and falls back to generic grounding tasks when that list
  is empty. Nudges are limited to one per sender and recipient per day (`NUDGE_LIMIT`). The per-feature behaviour to
  keep is in the feature map in `roadmap.md`.

## Expo and React Native conventions we follow

From Expo's official skills (verified 2026-09-29 in `expo/skills`):
`npx expo install` for every dependency; `expo-image` not `Image`; `react-native-safe-area-context` not RN
`SafeAreaView`; `React.use` not `useContext`; `boxShadow` style, never legacy `shadow*`/`elevation`;
`borderCurve: 'continuous'` on non-pill rounded corners; `<Text selectable>` for copyable data (invite code);
`fontVariant: ['tabular-nums']` for counters (streak, index %); `useWindowDimensions` not `Dimensions`; flexbox and
`gap` over margins; screen titles from the navigator header, not a custom text element; `expo-haptics` on iOS for
key actions (post mood, reaction); try Expo Go before creating a development build (on a physical iPhone that needs an
Expo Go matching the SDK: see `testing-and-verification.md`); treat `ios/` and `android/`
as generated (never edit them; configure through `app.json` and config plugins); use `@expo/ui` for platform
controls (switch, picker, date picker, menu) rather than a community library, and keep branded surfaces custom.
Do not wrap platform components that already carry their design language just to route them through the design system.

The React Compiler is on: no manual `useMemo`, `useCallback` or `React.memo` for performance; obey
`react-hooks/*` lint errors instead of silencing them.

## Accessibility, performance, security

- Every icon-only control has an `accessibilityLabel`; custom pressables set `accessibilityRole` and
  `accessibilityState` (`selected`, `disabled`, `busy`). The mood picker is a radio group of five options with labels
  (Rough, Low, Okay, Good, Great), not five unlabeled pictures.
- Never set `allowFontScaling={false}` app-wide; give rows `minHeight` and let labels wrap. Check large system text.
- `colors.textTertiary` fails contrast (2.3:1): placeholders and decoration only. Mood chip labels for levels 2 and 3
  need `colors.ink` below 14 px bold (`design-system.md`).
- Performance: FlatList, `expo-image`, no work in render; profile before adding FlashList or `useMemo`.
- Security: token only in secure storage; never log tokens, OTPs or emails; no secrets in `EXPO_PUBLIC_*`; the
  private note (`privateNote`) is write-only, the API never returns it, so do not cache or echo it.

## Definition of done for a screen

Walk its main task once, including one failure and its recovery when it loads or saves data; check
back/dismiss behaviour, keyboard access, a long name, no data, large system text, and the four states.
Then run the gates in `testing-and-verification.md` and say exactly what ran and what could not run.

## Templates

The seed for a **fresh** scaffold, verified together (type-check, ESLint with Prettier, 37 Jest tests, and the auth-gate
and session-resilience flows on the web export against the real backend). `mobile/src` has since grown past it (placeholder
routes replaced, `endSession()` also clears the prompt queue, `theme/typography.ts` and `mergeUser` refined; the last two
were synced back). Do not copy this over an existing `mobile/`. Copy at scaffold time only:

```bash
S=.claude/skills/moodcircle-mobile/assets
cp -R $S/src/. mobile/src/
cp $S/config/eslint.config.js $S/config/.prettierrc $S/config/tsconfig.json $S/config/.env.example mobile/
```

| File | Purpose |
|---|---|
| `api/client.ts`, `errors.ts`, `parse.ts` | envelope, `ApiError`, only-401 policy, timeout, cancellation, zod boundary |
| `api/index.ts` | the app's client, wired to the session store; `endSession()` |
| `api/query-client.ts` | defaults plus focus/online wiring |
| `api/schemas/*.ts` | zod schemas for every response, checked against the real backend by `scripts/contract-check.mjs`; `user.ts` also has `isProfileComplete` |
| `stores/session-store.ts` | hydrate, sign in, merge user, sign out, `selectStatus` |
| `utils/env.ts`, `ist-date.ts`, `secure-storage(.web).ts` | config, IST date math, token storage |
| `theme/*` | Moodbloom tokens (see `design-system.md`) |
| `app/_layout.tsx` | fonts, splash, hydration, `Stack.Protected` gate |
| `*.test.ts` | the tests that pin the behaviour above |
