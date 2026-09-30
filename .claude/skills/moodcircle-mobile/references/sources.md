# Sources and how to refresh them

Research done 2026-09-29. Expo and React Native move fast (a new SDK about every four months, breaking changes each
time), so treat anything here older than about two months as a lead to re-check, not as fact. The official template's
own `AGENTS.md` says the same: read the installed `expo` major version, then the matching docs, never memory.

## Contents
- Where each fact came from
- Hosts blocked in the sandbox and what to use instead
- How to refresh this skill

## Where each fact came from

| Topic | Source | How it was read |
|---|---|---|
| Current SDK, dist-tags, pinned versions | npm registry: `expo` (`latest` 57.0.26, `next` 58.0.0-preview.8), `node_modules/expo/bundledNativeModules.json` | `npm view`, installed spike |
| Folder structure, `src/app`, kebab-case, colocated tests | Expo skill `expo-project-structure` | `raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-project-structure/SKILL.md` |
| Router conventions, sheets, tabs, no `@react-navigation/*` imports (SDK 56+) | Expo skill `expo-router` | same path pattern, `expo-router/SKILL.md` |
| Fetching, four screen states, hydration gate, saves preserve work, `expo/fetch`, env vars | Expo skill `expo-data-fetching` | `expo-data-fetching/SKILL.md` |
| Tokens, component contract, extraction rule, native "slop" tells | Expo skill `expo-design-system` | `expo-design-system/SKILL.md` |
| Native UI rules (`expo-image`, `boxShadow`, `EXPO_OS`, safe areas, Expo Go first) | Expo skill `expo-native-ui` | `expo-native-ui/SKILL.md` |
| `@expo/ui` component selection | Expo skill `expo-ui` | `expo-ui/SKILL.md` |
| The skills index and the plugin | https://github.com/expo/skills (README), https://claude.com/plugins/expo, plugin id `expo@claude-plugins-official` | README via raw GitHub; plugin listing via the plugin search tool |
| Template contents and conventions | `create-expo-app@latest --template default` (`expo-template-default@57.0.28`) | scaffolded, installed and run in a throwaway project |
| `Tabs` custom `tabBar`, `Stack.Protected`, `formSheet` options, `expo-router/js-tabs` | installed `expo-router@57.0.24` typings | type-checked with a probe file |
| `expo lint`, Prettier, TypeScript 6 `types`, typed routes, Jest and RNTL 14 behaviour | run in the throwaway project | commands in `testing-and-verification.md` |
| Backend contract | this repo: `src/routes`, `src/controllers` | read, then proven by `scripts/contract-check.mjs` |
| Web behaviour and design | this repo: `public/js/*.js`, `public/css/app.css`, `public/index.html` | read |
| Running SDK 57 on a physical iPhone (which Expo Go, the sign-in requirement) | Expo docs source: `docs/scenes/get-started/set-up-your-environment/instructions/iosPhysicalExpoGo.mdx` (same on branches `sdk-55` to `sdk-57`; `main` adds the sign-in step), `docs/pages/troubleshooting/expo-go-version-mismatch.mdx`, `expo-go-sign-in-required.mdx`, `docs/pages/get-started/start-developing.mdx`; search snippets of the `expo.dev` changelog and the App Store listing (hosts blocked) | raw GitHub, 2026-09-30. The snippets disagree on whether an SDK 57 Expo Go reached the App Store: unresolved, so the first launch on a device decides |
| App Store rules (account deletion, user-generated content, IAP) | recalled, not fetched | flagged in `roadmap.md` as needing verification at submission |

Everything the skill states about running code (the harness, the templates, the flows, the contract check, the lint and
type-check recipes) was executed, including negative runs that prove the checks fail when the code is wrong.

## Hosts blocked in the sandbox and what to use instead

The environment's network policy denies `expo.dev`, `docs.expo.dev`, `api.expo.dev`, `reactnative.dev` and the React Native
Directory. The user can allow them in the environment's network settings; until then:

| Need | Use |
|---|---|
| Expo docs | the docs source on GitHub: `https://raw.githubusercontent.com/expo/expo/main/docs/pages/<path>.mdx` (versioned copies live under `docs/pages/versions/`), and the official skills above |
| Package versions | `npm view <pkg> version`, `npm view <pkg> peerDependencies --json`, the installed `bundledNativeModules.json` |
| Anything not on GitHub or npm | WebSearch, then a page it returns if the host is reachable |
| Expo CLI commands | prefix `EXPO_OFFLINE=1` (and `CI=1` for prompts) |
| `expo-doctor` | runs 19 of 21 checks; two need blocked hosts |

`curl` through the sandbox proxy works for `raw.githubusercontent.com`; the GitHub API and other repositories outside the
session's scope are refused, so read raw files rather than calling the API.

## How to refresh this skill

Do this when a new SDK is stable, when `stack-and-versions.md` is more than two months old, or before scaffolding.

1. `npm view expo dist-tags` and `npm view react-native dist-tags`; note what `latest` is.
2. Scaffold a throwaway app: `npx create-expo-app@latest spike --template default --no-install` in a temporary directory outside the repo, then `npm install`.
3. Re-run the gates from `testing-and-verification.md` on it, then copy `assets/src` in and run them again. Fix whatever moved
   (imports, options, lint rules) in `assets/`, not just in your copy.
4. Re-read the Expo skills listed above for changes (`expo-router` in particular: `NativeTabs` becomes stable in SDK 58, which
   reopens open decision 1).
5. Re-run `contract-check.mjs` if the backend changed since commit `a0de222`.
6. Update the versions table, the "verified on" dates and this file, and say what changed in the PR.
