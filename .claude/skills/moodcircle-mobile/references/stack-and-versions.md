# Stack and versions

Verified 2026-09-29 by scaffolding a throwaway app with `npx create-expo-app@latest spike --template default`
and running install, `tsc`, `expo lint`, Jest, `expo export --platform web` and Playwright against it
(see `testing-and-verification.md`). Re-verify before scaffolding if this date is more than about two
months old: Expo ships a new SDK roughly every four months and every one has breaking changes.

## Contents
- Pinned core (SDK 57)
- Libraries Expo does not pin
- Why each choice
- Version rules
- Template facts that affect us
- app.json settings we want

## Pinned core (SDK 57)

Let `npx expo install` choose these; the table is what it resolved on the verification date.

| Package | Version | Note |
|---|---|---|
| `expo` | `~57.0.26` | npm `latest`. SDK 58 exists only as `58.0.0-preview.*`; do not use previews |
| `react-native` | `0.86.3` | New Architecture is mandatory (since SDK 55) |
| `react` / `react-dom` | `19.2.3` | |
| `typescript` | `~6.0.3` | see "TypeScript 6" below |
| `expo-router` | `~57.0.24` | file-based routing, typed routes |
| `react-native-screens` | `~4.26.0` | |
| `react-native-safe-area-context` | `~5.7.0` | |
| `react-native-gesture-handler` | `~2.32.0` | |
| `react-native-reanimated` / `react-native-worklets` | `4.5.1` / `0.10.1` | already in the template; use sparingly |
| `react-native-svg` | `15.15.4` | npm latest is 15.15.5: Expo's pin wins. Needed for mood faces and icons |
| `expo-secure-store` | `~57.0.4` | session token (Keychain on iOS) |
| `expo-font` / `expo-splash-screen` | `~57.0.4` / `~57.0.9` | |
| `expo-image` | `~57.0.5` | instead of RN `Image` |
| `expo-haptics` | `~57.0.3` | |
| `expo-network` | `~57.0.2` | TanStack Query `onlineManager` |
| `expo-clipboard` / `expo-sharing` | `~57.0.2` / `~57.0.22` | invite code copy / share happiness index |
| `expo-notifications` | `~57.0.21` | phase 4, nudges. Remote push does not work in Expo Go on Android |
| `jest-expo` | `~57.0.5` | test preset |
| `eslint` + `eslint-config-expo` | `^9` + `~57.0.2` | installed by the first `expo lint` run; Expo pins ESLint 9 even though ESLint 10 exists |

The full list Expo pins for a given SDK is `node_modules/expo/bundledNativeModules.json`.

## Libraries Expo does not pin

Versions on the verification date. Pure JS, so no native rebuild when they change.

| Package | Version | Peer check |
|---|---|---|
| `@tanstack/react-query` | `5.104.0` | react `^18 \|\| ^19` |
| `zustand` | `5.0.15` | react `>=18` |
| `zod` | `4.6.5` | none |
| `@expo-google-fonts/fraunces` | `0.4.1` | exports `Fraunces_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold` |
| `@expo-google-fonts/dm-sans` | `0.4.2` | exports `DMSans_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold` |
| `@testing-library/react-native` | `14.0.1` | jest `>=29`, react `>=19`, RN `>=0.78`, peer `test-renderer ^1` (npm installs it) |
| `prettier`, `eslint-plugin-prettier`, `eslint-config-prettier` | latest | flat-config recipe verified, see below |

Do not add `@testing-library/jest-native` (deprecated; matchers ship inside RNTL), `axios` (Expo's own
guidance is `expo/fetch`), `lucide-react-native` or `@expo/vector-icons` (we draw icons with
`react-native-svg`, see `design-system.md`), or `react-test-renderer` (RNTL 14 renders with the
`test-renderer` peer that npm installs for it).

## Why each choice

- **Expo (managed, Continuous Native Generation)**: no Xcode needed for day-to-day work, EAS builds in
  the cloud, `ios/` and `android/` are generated and git-ignored. The user may not own a Mac.
- **Expo Router**: routes are files, typed `href`s, deep links for free, official template.
- **TanStack Query** for server state (cache, retry, refetch on focus, invalidation) and **Zustand** for the
  tiny amount of client state (session, one-shot UI flags). Two tools with a hard boundary beat one store
  that mixes both.
- **zod** at the API boundary: the backend is hand-written Express with no schema, so parsing responses turns
  silent drift into a clear error. Same schemas validate forms.
- **`expo/fetch`** (WinterCG fetch, Expo's stated preference). Under `jest-expo` it imports fine but does not
  perform real I/O, so the API client must take `fetch` as a parameter and tests pass a stub.
- **`expo-secure-store`** for the token. It has no web implementation, so ship `secure-storage.web.ts` backed
  by `localStorage`; that is only for the web verification build.
- **FlatList** for feeds. FlashList 2 (`2.0.2`, pinned by Expo) only if profiling shows a problem.
- **React Compiler is on** (`experiments.reactCompiler: true`): do not hand-write `useMemo`, `useCallback` or
  `React.memo` for performance. `eslint-config-expo` includes the compiler's lint rules and will flag code
  that breaks its assumptions (for example `setState` directly inside an effect).

## Version rules

1. Install with `npx expo install <pkg>`, never `npm i <pkg>` for anything that ships native code or is in
   `bundledNativeModules.json`. npm `latest` for `react-native` (0.87.x), `react` (19.3.x) and `typescript`
   (7.x) is newer than what SDK 57 supports.
2. After any dependency change run `npx expo install --check` and `npx expo-doctor`; fix with
   `npx expo install --fix`.
3. Moving to a new SDK is its own PR (`npx expo install expo@latest --fix`, read that SDK's changelog).
   SDK 58 stabilises `NativeTabs`; revisit the tab-bar decision then (`architecture.md`).
4. Node must be 22.13 or newer. The sandbox has 22.22.2.
5. iOS deployment target minimum for SDK 57 is 16.4.

## Template facts that affect us

`create-expo-app --template default` on SDK 57 produced (these are what we delete or replace at scaffold):

- `src/app/{_layout,index,explore}.tsx`, `src/components/*` demo files, `src/constants/theme.ts`,
  `src/hooks/use-theme.ts`, `src/global.css`. Uses `NativeTabs` from `expo-router/unstable-native-tabs`
  natively and the headless `expo-router/ui` tabs on web.
- `AGENTS.md`, `.claude/settings.json` (enables the official `expo@claude-plugins-official` plugin; `--no-agents-md` skips
  both), `.vscode/`, `README.md`, `LICENSE`, `scripts/reset-project.js` (do not use it: `roadmap.md`, Phase 0).
- Dependencies the demo screens use and we probably do not: `expo-glass-effect`, `expo-device`,
  `expo-web-browser`, `expo-symbols`, `@expo/ui`. Grep for imports, then `npm uninstall` what is unused and
  re-run `expo-doctor`. Keep Expo Router's peers: `expo-linking`, `expo-constants`,
  `react-native-screens`, `react-native-safe-area-context`.
- **The untouched template fails its own lint**: `src/hooks/use-color-scheme.web.ts` triggers
  `react-hooks/set-state-in-effect`. We are light-only, so delete the `use-color-scheme*` hooks and the theme
  files that use them in the scaffold commit, and lint is green from the start.
- `tsconfig.json` extends `expo/tsconfig.base` with `strict: true` and paths `@/*` -> `./src/*` and
  `@/assets/*` -> `./assets/*`.

### TypeScript 6

TypeScript 6 no longer includes every `@types/*` package automatically. With `@types/jest` installed,
`describe`/`it`/`expect` are "Cannot find name" until `tsconfig.json` says
`"compilerOptions": { "types": ["jest"] }`. Verified: with that line `tsc --noEmit` exits 0 on the template
plus a probe that used `Tabs` (custom `tabBar`), `Stack.Protected` and `formSheet` options.

### Generated files `tsc` needs

`expo-env.d.ts` and `.expo/types/router.d.ts` are git-ignored and only written by the Metro dev server
(`expo export` does not write them). On a fresh checkout run `scripts/typegen.mjs` before
`npx tsc --noEmit`.

### ESLint and Prettier (verified)

`EXPO_OFFLINE=1 CI=1 npx expo lint` installs `eslint@^9` and `eslint-config-expo` and writes a flat
`eslint.config.js` on first run, but only when no config exists yet. If you copy `assets/config/eslint.config.js` first,
install the packages yourself (`npx expo install --dev eslint eslint-config-expo`) or lint fails with "Cannot find module
'eslint-config-expo/flat'" (found in the scaffold dry run). To add Prettier:

```bash
npm i -D prettier eslint-plugin-prettier eslint-config-prettier
```

```js
// eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  { ignores: ['dist/*', '.expo/*'] },
]);
```

`.prettierrc`: `{ "singleQuote": true, "printWidth": 100, "trailingComma": "all" }`. Format the whole tree once
with `npx expo lint --fix` in the scaffold commit so later diffs are only real changes.

## app.json settings we want

```jsonc
{
  "expo": {
    "name": "MoodCircle",              // confirm with the user
    "slug": "moodcircle",
    "scheme": "moodcircle",
    "orientation": "portrait",
    "userInterfaceStyle": "light",      // the Moodbloom palette has no dark variant yet
    "ios": { "bundleIdentifier": "TBD" },   // ask the user; cannot be changed casually later
    "web": { "output": "single" },      // SPA: verified with the harness; web is only our test build
    "experiments": { "typedRoutes": true, "reactCompiler": true },
    "plugins": ["expo-router"]          // plus whatever `expo install` adds for a native module
  }
}
```

`web.output: "single"` was verified: export produces one `index.html`, and a direct deep link such as
`/explore` renders through the harness's SPA fallback. The template's default `static` output generates one
HTML file per route, which the harness would need to map.
