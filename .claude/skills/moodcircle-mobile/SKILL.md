---
name: moodcircle-mobile
description: Architecture, pinned stack, verified templates and workflow for building the MoodCircle native mobile app (React Native with Expo SDK 57, Expo Router, TypeScript, TanStack Query, Zustand) on top of this repo's Express/SQLite API. Use this skill whenever the user mentions the mobile app, iOS or Android app, React Native, Expo, EAS, TestFlight, the App Store, push notifications for nudges, a mobile/ folder, or asks to bring any MoodCircle screen, feature or fix to a phone app, even if they never say "skill". Also use it before adding a dependency to the app, deciding where a mobile file goes, writing app code that calls the API, or verifying mobile work in the Linux cloud sandbox (no Xcode or simulator).
---

# MoodCircle mobile

The web app (`public/`, backend in `src/`) is finished and deployed. This skill is how the phone app gets built next to it:
one standard architecture, one pinned stack, code that is already proven, and a way to verify work in a container that has
no iPhone. It exists so that every session starts from the same decisions instead of re-deriving them.

**Status (2026-09-29): Phases 0 and 1 are built** on stacked branches `feat/mobile-scaffold` and `feat/mobile-sign-in`
(check `git branch -r` and `main` for what has merged): the `mobile/` Expo app boots, gates three route groups, and has
sign-in (code and password), verification, profile setup, "what makes you feel good" and the quick-login password offer.
Phase 2 (groups and the Home feed) is next and waits for the user's go-ahead. Nothing has run on an iPhone.
`references/roadmap.md` has the phases, decisions taken and the open decisions.

**`mobile/` is now the source of truth.** `assets/` only seeds a brand-new scaffold; never copy it over an existing
`mobile/src` (it would replace the real screens with placeholders). Reuse components, hooks and screens from `mobile/src`.

If the task is about the web app only (`public/`, `src/`), this skill does not apply.

## Ground rules, and why

1. **Research before code.** Expo ships breaking changes every SDK and the official template's own `AGENTS.md` says not to
   trust training data. Read the `expo` version in `mobile/package.json` and check the docs for that version before touching an
   Expo, EAS or React Native API. `docs.expo.dev`, `expo.dev` and `reactnative.dev` are blocked in this sandbox: read the docs
   source and Expo's official skills on `raw.githubusercontent.com`, and use npm and web search (`references/sources.md`).
2. **One vertical slice per branch and PR.** Small reviewable diffs; the user has already asked once for "not everything in
   one file". Small single-purpose files, routes only in `src/app`.
3. **Stay on the pinned stack.** Add packages with `npx expo install`, never bump SDK, React or React Native by hand, and do
   not use npm's `latest` for them (it is newer than SDK 57 supports). `references/stack-and-versions.md`.
4. **Reuse what exists, do not rewrite it from memory.** Look in `mobile/src` first (`components/`, `hooks/`, `api/`,
   `theme/`, `test-utils/`) and extend it; a second copy of a button or a fetch wrapper is drift. On a fresh scaffold, seed from
   `assets/` (API client, session store, auth gate, tokens, icons, mood faces, each with tests). The web app shipped two bugs
   in exactly this area (a network blip signed users out; a returning user's login was hijacked into onboarding), and the
   tests plus flows guard against both.
5. **The server owns the truth; only a real 401 signs out.** Never derive "checked in today" or scores on the client; never sign
   out on a network error, a 5xx, an HTML error page or a wrong password.
6. **Verify, then report honestly.** This container cannot run iOS. Say which layers ran and which did not, and never write
   "tested on iOS". `references/testing-and-verification.md`.
7. **Backend changes are their own PRs**, followed by `contract-check.mjs`. Do not smuggle them into an app slice.
8. **Follow Expo's conventions unless there is a reason not to, and write the reason down.** The deliberate deviations are
   listed in `references/design-system.md` and `references/architecture.md` (brand palette instead of semantic colours, custom
   tab bar with a centre "+", own SVG icons).

## Stack at a glance

Expo SDK 57 (`expo ~57.0.26`), React Native 0.86.3, React 19.2.3, TypeScript ~6.0.3, Expo Router ~57.0.24 with typed routes,
React Compiler on (no manual `useMemo`/`useCallback`), New Architecture (mandatory), Node 22.13+. State: TanStack Query 5 for
server data, Zustand 5 for the session and one-shot UI flags. Boundary: zod 4 schemas, `expo/fetch`. Storage: `expo-secure-store`
for the token. UI: `react-native-svg`, Fraunces and DM Sans from `@expo-google-fonts`, FlatList. Tests: Jest with `jest-expo`,
React Native Testing Library 14. Lint: ESLint 9 with `eslint-config-expo` and Prettier. Builds: EAS. Verified 2026-09-29;
re-check versions if it is older than two months.

## Architecture in brief

```
mobile/src/
  app/         routes only, thin: (auth)  (onboarding)  (app)/(tabs)  sheets   gated by Stack.Protected
  screens/     screen bodies, one folder each, private pieces inside
  components/  shared UI (2+ screens): button, chip, avatar, mood-face, icon, mood-tab-bar ...
  api/         the only code that talks HTTP: client, errors, zod schemas, one module per resource
  hooks/       TanStack Query wrappers and key factories (use-groups.ts ...)
  stores/      session-store (token + user, hydration), ui-store (one-shot flags)
  theme/       one entry point: colors, spacing, radius, typography
  utils/       env, ist-date, secure-storage(.web), pure helpers
```

Dependencies point one way: `app` to `screens` to `components`/`hooks`; `hooks` to `api`; `api` to `utils`. Screens never call
`api` directly, components never import `api` or `stores`. The auth gate has three states from `selectStatus`: `signedOut`
to `(auth)`, `needsProfile` (no display name) to `(onboarding)`, `ready` to `(app)`. Joy onboarding is a continuation of first
profile setup, never a gate. Full detail: `references/architecture.md`.

## Workflow for any mobile task

1. **Orient.** `git fetch`, then check whether the earlier slice branches merged and start from the right base. Which phase
   is this (`references/roadmap.md`)? Read the web module it ports (the feature map names it), the matching part of
   `references/api-contract.md`, and the existing `mobile/src` pieces the slice will reuse.
2. **Research** what the slice touches (rule 1). If the official Expo plugin is enabled in the session, its skills
   (`expo-router`, `expo-data-fetching`, `expo-native-ui`, `expo-design-system`) are worth loading; this skill does not depend on it.
3. **Settle open decisions** that block the slice. Ask the user only for what changes the outcome (name and bundle id,
   hardware, tab bar), and give a recommendation with each question. Otherwise state the default you chose.
4. **Branch** `feat/mobile-<slice>` from the latest `origin/main`.
5. **Build** to `references/architecture.md` and `references/design-system.md`: tokens not literals, four states on every data
   screen, drafts kept on failed saves, `accessibilityLabel` on icon-only controls, no dead buttons.
6. **Test**: colocated unit tests, plus a `verify-web` flow for UI slices (`mobile/verify/flows/<slice>.mjs`, copy
   `scripts/flows/*.example.mjs`). Break the code once on purpose to prove the new check can fail.
7. **Run the gates** (below) and look at the screenshots.
8. **Commit** in small logical commits; push the branch. Open a PR only when asked, and never merge one yourself.
9. **Report** in the shape given in `references/testing-and-verification.md`: what was built, what ran, what did not, what to
   check on a device, deviations and open decisions.

## Commands (from `mobile/`, `S=../.claude/skills/moodcircle-mobile/scripts`)

```bash
node $S/typegen.mjs . [--force]              # fresh checkout: expo-env.d.ts and typed-route files (--force after route changes)
npx tsc --noEmit
EXPO_OFFLINE=1 CI=1 npx expo lint            # add --fix for Prettier
npx jest
node $S/contract-check.mjs --project .       # after API, schema or backend changes (55 checks, real backend)
node $S/verify-web.mjs --project . --flow verify/flows/<slice>.mjs    # web export in headless Chromium, phone size
npx expo install --check                     # after dependency changes; `npx expo-doctor` (2 of 21 checks need blocked hosts)
```

`EXPO_OFFLINE=1` is needed for any Expo CLI command here because `api.expo.dev` is blocked; the scripts set it themselves.

## What exists and where

| Path | What it is |
|---|---|
| `mobile/src/` | the app: source of truth from Phase 1 on (API client and auth hooks, stores, theme, shared components, sign-in and onboarding screens, routes) |
| `mobile/verify/flows/` | the app's own web-export flows (`auth`, `auth-returning`); each slice adds one |
| `assets/src/`, `assets/config/` | seed for a **fresh** scaffold only: API client and schemas, session store, gate, tokens, `Icon`, `MoodFace`, utils, lint/format/tsconfig. Same code that Phase 0 started from, with its tests |
| `scripts/typegen.mjs` | generates the git-ignored files `tsc` needs |
| `scripts/verify-web.mjs` + `flows/` | throwaway backend, web export, same-origin proxy, Playwright; flow templates `smoke`, `scaffold-check` (Phase 0 only), `auth-gate.example`, `session-resilience.example` |
| `scripts/contract-check.mjs` | proves the schemas and error codes against the real backend |

Seeding a scaffold: `references/roadmap.md`, Phase 0. Against the built app on 2026-09-29: type-check, lint, 100 unit tests in 19
suites, both web flows and the contract check were green (web export only, nothing on iOS).

## Read next

| When | Read |
|---|---|
| Choosing or adding a package, upgrading, template and tooling facts | `references/stack-and-versions.md` |
| Placing a file, routing, sessions, data fetching, forms, conventions | `references/architecture.md` |
| Calling an endpoint, handling an error code, backend gaps | `references/api-contract.md` |
| Building UI, colours, type, icons, component specs, contrast | `references/design-system.md` |
| Testing, gates, the web harness, what needs a real device, traps | `references/testing-and-verification.md` |
| What to build next, scaffold steps, feature map, backend work, App Store, open decisions | `references/roadmap.md` |
| Where facts came from, blocked hosts, refreshing the skill | `references/sources.md` |

## Traps that already cost time

- `tsc` says `describe`/`expect` are undefined: TypeScript 6 needs `"types": ["jest"]` (shipped in `assets/config/tsconfig.json`).
- `tsc` cannot find route types: run `typegen.mjs` (add `--force` after adding or renaming a route file, or `router.push('/new')`
  is a compile error); only the dev server writes them.
- The untouched template fails its own lint (`use-color-scheme.web.ts`): it is deleted at scaffold, we are light-only.
- Under Jest, `expo/fetch` does no real I/O: inject a stub `fetch` into the client.
- `jest.mock` factories may only use variables named `mock*`; RNTL 14's `render` is async; `toHaveTextContent('str')` must
  match the WHOLE text (use a regex for a substring); test query clients need `gcTime: Infinity` or Jest warns about a leaked worker.
- A phone cannot reach `localhost`: `EXPO_PUBLIC_API_URL` must be a LAN IP or the deployed HTTPS URL.
- The backend echoes the OTP whenever `NODE_ENV` is not `production`: the app must never read it.
- Do not put tests, types or helpers in `src/app`; every file there becomes a route.
- Scaffolding (`references/roadmap.md`, Phase 0): skip `npm run reset-project` (its `index.tsx` bypasses the auth gate), install
  ESLint before linting, and note the template ships no Jest and Jest must be 29, not npm's `latest`.
