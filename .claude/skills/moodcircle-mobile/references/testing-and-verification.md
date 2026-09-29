# Testing and verification

This runs in a Linux cloud container: no Xcode, no iOS simulator, no phone. So work is verified in layers,
and the report says which layers ran. Never write "tested on iOS" from anything below.

## Contents
- What can and cannot be verified here
- The gates (run in this order)
- Unit and component tests
- The web harness (`verify-web.mjs`)
- The contract check
- Prove a check can fail
- What the user must verify on a device
- Definition of done and the report
- Traps we already hit

## What can and cannot be verified here

| Layer | Here? | How |
|---|---|---|
| Type safety, lint, formatting | yes | `tsc`, `expo lint` |
| Logic (client, stores, utils, tokens) | yes | Jest with `jest-expo` |
| Component rendering, accessibility props | yes | React Native Testing Library 14 |
| Routing, auth gate, persistence, retry UI, layout at phone size | approximately | `verify-web.mjs`: the web export in headless Chromium at 390x844. It runs react-native-web, not the iOS renderer |
| Real API responses vs our schemas and error codes | yes | `contract-check.mjs` against a throwaway backend |
| iOS rendering, safe areas, notch, `formSheet` detents, native tab bar, haptics, keyboard behaviour, Keychain, fonts on device, push | **no** | needs Expo Go, a development build, or TestFlight on a real device |
| Anything using `api.expo.dev`, `docs.expo.dev`, `expo.dev`, `reactnative.dev` | **no** | blocked by the environment's network policy (`EXPO_OFFLINE=1` works around the CLI) |

## The gates (run in this order)

From `mobile/`. `S=../.claude/skills/moodcircle-mobile/scripts`.

```bash
node $S/typegen.mjs .                                   # once per fresh checkout: expo-env.d.ts + .expo/types
npx tsc --noEmit                                        # must exit 0
EXPO_OFFLINE=1 CI=1 npx expo lint                       # must exit 0 (prettier errors: add --fix)
npx jest                                                # must pass
node $S/contract-check.mjs --project .                  # after any API/schema/backend change
node $S/verify-web.mjs --project . --flow verify/flows/<slice>.mjs   # for UI slices
npx expo install --check                                # after any dependency change
npx expo-doctor                                         # see note
```

Notes:
- `EXPO_OFFLINE=1`: without it the Expo CLI stalls trying to reach `api.expo.dev`. `expo lint` also needs `CI=1` so
  it installs ESLint without prompting. Both are set inside the two scripts.
- `expo install --check` prints "Dependency validation is unreliable in offline-mode"; it still catches drift against
  the bundled versions. `expo-doctor` runs 19 of 21 checks offline: the "config schema" and "React Native Directory"
  checks fail here because their hosts are blocked, and that is expected. Any other failure is real.
- Type-check needs the generated files. Typed routes turn a stale `href` into a compile error (verified), which is
  the point.

## Unit and component tests

Config: `"jest": { "preset": "jest-expo" }` in `package.json`. `@/` imports resolve; no mapper needed once the
template's `global.css` import is gone. Put tests next to the code (`thing.test.ts`), never inside `src/app`.

- `tsconfig.json` needs `"types": ["jest"]` (TypeScript 6 no longer loads `@types/*` implicitly).
- **RNTL 14 is async**: `const view = await render(<X />)`. Un-awaited use of `screen` throws "notImplemented".
  User events are async too (`await userEvent.setup().press(...)`).
- `jest.mock(...)` factories may only reference variables prefixed `mock` (`mockMemory`), or Jest refuses to run the file.
- `expo/fetch` imports under `jest-expo` but performs no network I/O and resolves silently. Never rely on it in tests:
  inject a stub into `createApiClient({ fetch })` (see `assets/src/api/client.test.ts`).
- To assert accessibility on an element that may carry `undefined` props, assert the positive
  (`toMatchObject({ props: { accessibilityRole: 'image' } })`); `toHaveProperty` counts a key set to `undefined` as present.
- Test behaviour that broke on the web, not just happy paths: only a real `UNAUTHORIZED` signs out, a network error
  keeps the session, a profile response merges instead of replacing, joy onboarding never gates login. Those tests exist
  in the templates; keep them green and extend them.

## The web harness (`verify-web.mjs`)

```bash
node $S/verify-web.mjs --project . --flow verify/flows/auth.mjs [--flow ...] [--out /tmp/shots] [--skip-build]
```

It starts the real backend on a free port with a throwaway SQLite file (`NODE_ENV` is not production, so the OTP
request returns the code; SMTP is blanked so nothing is emailed), runs `expo export --platform web` with
`EXPO_PUBLIC_API_URL=/api`, serves `dist/` and proxies `/api` to the backend on one origin (the backend has no CORS),
drives the app in headless Chromium at phone size with touch on, runs your flows, and exits non-zero on any failed
check, console error, failed request, or 5xx from `/api`. A full run takes 5 to 40 seconds.

Requires Playwright with a browser (preinstalled in the sandbox; it looks in the global `npm root -g` when the project
has none) and web support in the project (`react-native-web`, `web.output: "single"`).

**Flows** are ES modules in the repo (`mobile/verify/flows/<slice>.mjs`) so they double as regression checks. Each slice
adds one. The API given to a flow:

| Helper | Use |
|---|---|
| `page`, `baseUrl` | Playwright page and the origin serving the app |
| `expect(cond, label)` | record a check; never throws, so all checks run |
| `waitForText(text, label?)` | wait until visible text appears, recorded as a check |
| `pageText()` | visible text on one line |
| `shot(name)` | screenshot to `<out>/<flow>-<name>.png` |
| `allow(/regex/)` | declare console or network errors that this flow provokes on purpose |
| `api.signIn(email)`, `api.request(...)`, `api.uniqueEmail()` | seed accounts, groups and moods through the API instead of clicking |

Templates to copy: `scripts/flows/smoke.mjs` (harness sanity), `scaffold-check.mjs` (Phase 0 only: the gate boots into the signed-out group and nothing renders outside it), `auth-gate.example.mjs` (signedOut, needsProfile, ready,
persistence, sign-out) and `session-resilience.example.mjs` (network failure, 503 HTML, rejected token). Change the
marker texts to the real screens and keep every assertion: each guards a bug the web app shipped.

Look at the screenshots. Open the PNGs with the Read tool and compare them with the design reference; a passing
assertion does not prove the layout is right.

What it proves: routing, the auth gate, persistence, retry behaviour, data flow through the real API, that layouts render
at 390x844. What it does not prove: anything iOS-specific (see the table above). Say "web export check" in reports.

## The contract check

```bash
node $S/contract-check.mjs --project .
```

55 checks (at the time of writing) over every endpoint the app uses: each response is parsed with the zod schemas in `src/api/schemas`, and each
error code in `api-contract.md` is provoked. Run it when the backend changes, when a schema changes, and before trusting
`api-contract.md`. It re-runs itself with the Node flags it needs, so Node 22.13 or newer works.

## Prove a check can fail

A check that cannot fail is decoration. When you add a regression test or flow, break the code on purpose once and watch it
go red, then restore. This was done for the templates: reintroducing "sign out on any error" in the client fails the
`client.test.ts` case and the `session-resilience` flow; changing a schema type fails `contract-check`. Note the
mutation in the PR when it is the only thing guarding a bug.

## What the user must verify on a device

Say plainly that the slice was not run on iOS and hand over the exact steps. To run on an iPhone without a Mac: install
Expo Go from the App Store, run `npx expo start` on the computer, scan the QR code. `EXPO_PUBLIC_API_URL` must be an address
the phone can reach: the computer's LAN IP (`http://192.168.x.x:3000/api`) or the deployed HTTPS URL, never `localhost`,
which is the phone itself. Anything with native code outside Expo Go (widgets, some notification features) needs a
development build: `eas build --profile development --platform ios`.

Checklist to give the user for each UI slice: notch and home-indicator spacing, keyboard covering inputs, sheet drag and
dismiss, tab bar with the centre "+", pull to refresh, haptics, text at the largest system size, sign in, kill the app and
reopen (still signed in), airplane mode on open (retry, not sign-in).

## Definition of done and the report

Done means all of: `tsc` 0, `expo lint` 0, `jest` green, `contract-check` green when the API layer changed, the relevant
`verify-web` flows green with screenshots reviewed, `expo install --check` clean when dependencies changed, one failure and
its recovery exercised for any screen that loads or saves data, no dead buttons (every control does what it says).

Report in this shape, and never claim more:
1. What was built (files, in one or two lines).
2. What ran and its result (commands and counts).
3. What did not run and why (iOS device, blocked hosts, doctor's two network checks).
4. What the user should check on a device.
5. Deviations from the design or from Expo guidance, and open decisions.

## Traps we already hit

| Symptom | Cause and fix |
|---|---|
| `Cannot find name 'describe'` from `tsc` | TypeScript 6 does not auto-load `@types/jest`: add `"types": ["jest"]` |
| `expo lint`: "Cannot find module 'eslint-config-expo/flat'" | our `eslint.config.js` was copied before ESLint was installed: `npx expo install --dev eslint eslint-config-expo` |
| `tsc` cannot find `expo-env.d.ts` or route types | they are generated by the dev server only: `scripts/typegen.mjs` |
| `expo lint` reports `set-state-in-effect` in `use-color-scheme.web.ts` | that is the untouched template; delete the file (we are light-only) |
| Any Expo CLI command hangs | `api.expo.dev` is blocked: set `EXPO_OFFLINE=1` |
| `jest.mock` "out-of-scope variables" | prefix the variable with `mock` |
| RNTL "notImplemented" | `render` is async in v14: `await render(...)` |
| Web flow shows the Home tab for `/probe` | the template's tab layout only registers its own routes; our root is a `Stack` |
| `expo export` static output needs a file per route | use `web.output: "single"` (SPA) |
| A web flow "fails" on an intentional 401/503 | the harness counts console errors; declare them with `allow(/.../)` |
| `getByText('Me')` matches "Home" | use a unique marker text or `{ exact: true }` |
| Backend `EADDRINUSE` | the scripts take a free port from the OS; do not hard-code one |
| Node prints `MODULE_TYPELESS_PACKAGE_JSON` | only in loaders; `contract-check` re-execs with `--disable-warning` |
| `expo-doctor` reports 2 failures | config schema and RN Directory checks need blocked hosts; ignore those two |
