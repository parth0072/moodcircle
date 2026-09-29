# Design system

The look is the Moodbloom redesign already shipped on the web (`public/css/app.css`, merged in PR #5): warm
cream, navy ink, Fraunces headlines, hand-drawn line-art mood faces, flat surfaces with 1 px borders. The native
app reproduces it; it does not reinterpret it. The tokens live in `mobile/src/theme/` and the shared components in
`mobile/src/components/` (Phase 0's seed is in `assets/`). The sign-in and onboarding screens built on them were rendered on
the web export and compared side by side with the original web screens; they match apart from the deliberate changes listed
under "Deliberate differences from the web screens" below. Fonts in that comparison were fallbacks (Google Fonts is blocked
in the sandbox), so type has not been judged on a device.

## Contents
- Rules
- Where we deliberately differ from Expo's defaults
- Tokens
- Shapes and surfaces
- Components to build (specs from the web CSS)
- Icons and mood faces
- Off-palette colours and contrast facts
- Feedback, motion, accessibility

## Rules

From Expo's `expo-design-system` skill, adopted as written:
1. ONE theme entry point: `import { colors, spacing, radius, type } from '@/theme'`. Never a second token file.
2. A visual value used twice becomes a token. No hex, font size or spacing literal in a screen; a genuinely local
   value (an optical nudge) may stay inline with a comment saying why.
3. Components import tokens; screens import components. A screen that redefines a button colour is drift.
4. Every shared primitive declares variants, sizes, states (pressed, disabled, loading), accepts `style` and merges
   it last, and exposes role and state to accessibility. No tappable element without pressed feedback.
5. Promote inline JSX to `screens/<name>/` to `components/` only when a second screen needs it and it has a
   nameable role. Composition over configuration: when props start describing content, take `children`.
6. Do not wrap platform components that already carry the design language (`Switch`, date pickers, stack
   headers) just to route them through the system.

## Where we deliberately differ from Expo's defaults

| Expo's advice | What we do | Why |
|---|---|---|
| Build the palette from platform semantic colours (`Color.ios.*`), light and dark for free | Fixed brand palette, light only (`userInterfaceStyle: "light"`) | The Moodbloom palette is the product. There is no dark variant to design against yet |
| SF Symbols via `expo-symbols` | Our own `<Icon>` over `react-native-svg`, paths copied from the web | Same drawing as the web and the mood faces, one implementation on every platform, and it renders in the web verification build (SF Symbols do not) |
| `NativeTabs`, and no FAB on iOS | JS tabs with a custom tab bar and a centre "+" | The reference design; isolated in one file so it can be swapped (see `architecture.md`, open decision 1 in `roadmap.md`) |
| Transparent sheet background (iOS 26 glass) | Opaque cream sheet background | Glass fights the palette |
| `@expo/ui` for pickers, sheets, menus | Use it for switches, pickers, menus; keep chips, cards, buttons, mood tiles custom | Branded surfaces must look branded |

## Tokens

Source: `mobile/src/theme/`. Every value below is copied from the `:root` block of `public/css/app.css`.

| Token | Value | Web var | Use |
|---|---|---|---|
| `colors.background` | `#FAF6EE` | `--bg` | screen background, inactive tiles |
| `colors.surface` | `#FFFFFF` | `--white` | cards, sheets, tab bar, inputs |
| `colors.border` / `borderStrong` | `#E9E1D0` / `#DDD0B4` | `--border` / `--border2` | card and bar borders / input, chip, tile borders |
| `colors.brand` | `#3651A8` | `--p` | primary buttons, active tab, links, focus |
| `colors.brandTint` / `brandBorder` / `brandText` | `#E3E9F7` / `#B7C4EC` / `#4A5A9C` | `--p-dim` / `--p-border` / `--p-text2` | selected states, check-in bar |
| `colors.ink` / `text` | `#1E2A5A` | `--p-dark` / `--txt` | headings, body, mood-face stroke |
| `colors.textSecondary` | `#5F6A8C` | `--txt2` | labels, captions |
| `colors.textTertiary` | `#9CA5C4` | `--txt3` | placeholders, timestamps, inactive tab. **Decoration only** (2.3:1) |
| `moodColors[1..5]` | solid / tint / text per level | `--mN`, `--mNb`, `--mNt` | face tiles, chips, chart bars, pips |
| `radius` | sm 14, md 20, lg 26, full 9999 | `--r2`, `--r`, `--r3`, 99px | inputs and tiles, cards, sheets, pills |
| `spacing` | 1:4 2:8 3:12 4:16 5:20 6:24 8:32 12:48 | ad hoc px | 4-point grid; 12 and 20 are used a lot by the web |

Mood levels and labels: 1 Rough, 2 Low, 3 Okay, 4 Good, 5 Great. Levels 1 and 2 (Rough and Low) trigger
mind-divert and the "Send support" nudge.

Avatar colours (`avatarColors`, 8 of them): a user with no emoji avatar gets `avatarColors[n % 8]` where `n` is the
sum of the character codes of their id (`idColor` in `public/js/helpers.js`). Same user, same colour, everywhere.

### Typography

Fraunces (semi-bold 600, bold 700 for the streak number) carries headlines, scores, stat numbers, mood labels and
the mind-divert quote; DM Sans carries everything else. Font files are per weight, so styles set `fontFamily` and
never `fontWeight` (iOS would synthesise the weight or fall back to system). The web's weight 800 (five uses) maps to
bold. Roles in `type`:

| Role | Font, size | Used for |
|---|---|---|
| `displayHero` | Fraunces 700, 60, tracking -2 | the streak number |
| `displayLg` | Fraunces 600, 30 | app title on sign-in |
| `displayTitle` | Fraunces 600, 27 | profile and joy setup titles |
| `displayMd` | Fraunces 600, 24 | code-entry heading |
| `stat` | Fraunces 600, 28, tabular | stat tiles |
| `score` | Fraunces 600, 26, tabular | vibe score |
| `quote` | Fraunces 600, 17, line 24 | mind-divert card |
| `displaySm` | Fraunces 600, 16 | check-in bar title, chart headings |
| `moodLabel` | Fraunces 600, 13 | mood chips and tile labels |
| `heading` | DM Sans 700, 22 | sheet titles (password offer), joy step heading |
| `title` | DM Sans 700, 16 | header titles, digits in the code boxes |
| `body` / `bodyStrong` | DM Sans 400 / 600, 15 | notes, names, button labels |
| `bodySm` | DM Sans 400, 14 | secondary explanatory lines |
| `label` | DM Sans 500, 13 | field labels, chips, buttons small |
| `link` / `linkLg` | DM Sans 600, 13 / 14 | text buttons, selected chip label |
| `caption` | DM Sans 400, 12 | timestamps, sub-lines |
| `micro` | DM Sans 500, 10 | tab labels, tags |

Counters and percentages use `fontVariant: ['tabular-nums']` (already in `score`, `stat`, `displayHero`). Never disable
font scaling; give rows `minHeight` and let text wrap.

## Shapes and surfaces

Flat. Surfaces are white on the cream background with a 1 px `border`; there are no shadows in the web design (its only
`box-shadow` frames the desktop preview), so do not add `boxShadow`. Non-pill radii get `borderCurve: 'continuous'`.

## Components to build (specs from the web CSS)

Build these as they are needed by a slice, each in `components/`, kebab-case, one named export. Rows marked **built** exist in
`mobile/src/components/`: use them, and extend a variant rather than adding a second component.

| Component | Spec (web class) |
|---|---|
| AppText **(built)** | the one way screens render text: `variant` (a `type` role) plus `color` (`text`, `textSecondary`, `textTertiary`, `brand`, `onBrand`, `danger`); `style` merges last. Nested text picks a different role instead of overriding `fontFamily` |
| Screen **(built)** | scrolling form container: `ScrollView` with `contentInsetAdjustmentBehavior="automatic"`, `automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"`, 24 pt side padding; props `background` (`surface` or `background`), `align` (`center` or `start`), `decoration` (the sign-in blobs), `top` (small for sheets, the grabber sits above) |
| Button **(built)** | pill (`radius.full`), `minHeight` 48, text `bodyStrong` (15/600); primary = brand bg + white text; outline = surface bg + `borderStrong` 1 px; stretches to full width; disabled opacity .5; pressed opacity .8; loading shows a spinner and reports `busy` to accessibility (`.btn`) |
| TextButton **(built)** | link-styled action, `link` (13/600) or `linkLg` (14/600) in `brand`, `hitSlop` 10 |
| IconButton **(built)** | 34x34, radius `sm`, 1 px `border`, surface bg, icon in `textSecondary`, `hitSlop` 6, `label` is required (`.icon-btn`) |
| TextField **(built)** | label 13/500 `textSecondary` (`hideLabel` keeps it for screen readers only); input `minHeight` 46, surface bg, 1 px `borderStrong`, radius `sm`, text 15, focus border `brand`, error border `accents.danger`, placeholder `textTertiary`; optional `prefix` cell (the `@` of the username); inline error below it with `accessibilityRole="alert"`; `outlineWidth: 0` so the browser focus ring does not show on the web build (`.field`, `.input`) |
| OtpInput **(built)** | one real, transparent `TextInput` laid over six decorative boxes (so paste, autofill and backspace work natively); digits only; `textContentType="oneTimeCode"` so iOS offers the emailed code; filled box `brandTint`, active box `brand` border |
| Card | surface, 1 px `border`, radius `md`, padding 14, gap 10 (`.mcard`, `.stat-tile`, `.chart-wrap`) |
| Chip **(built)** | pill, padding 9x14, 1.5 px `borderStrong`, bg `background`, text `textSecondary` 13/500; selected = `brandTint` bg, `brand` border and text, 600 (`.chip`, `.chip.sel`); reports `selected` (used as a checkbox on the joy screen) |
| Segmented pill tabs | 7 / 30 / 90 days: pill padding 6x14, selected = brand bg, white text (`.p-tab`) |
| MoodPicker | five equal tiles (`flex:1`, gap 6, padding 10/4/12), each a 34x34 circle in `moodColors[l].tint` holding a 22 px face, over a 10/600 `textSecondary` label; border 1.5 `borderStrong`, radius `sm`, bg `background`; selected = `brandTint` bg and `brand` border (`.m-opt`); radio semantics |
| MoodChip | pill, padding 4x10, `moodColors[l].tint` bg, small face + label (`.mood-chip`). Use `colors.ink` for the label of levels 2 and 3 |
| Avatar | 38x38, radius 10, initial in white 13/bold on `avatarColors`, or an emoji on `brandTint` at 28; anonymous = "👤" on `background` with a `borderStrong` border; profile 68x68 radius 18 (`.av`, `.p-av`) |
| Tags | "you" (brandTint bg, brandBorder, brand text) and "anonymous" (background bg, borderStrong, textSecondary): pill, 10 px (`.you-tag`, `.anon-tag`) |
| Reaction pill | pill, padding 4x10, 1 px `borderStrong`, bg `background`, 12/500; on = brand text and border, `brandTint` bg (`.rxn`, `.rxn.on`) |
| Nudge button | pill, padding 4x10, 12 px, 1 px `borderStrong`, `textTertiary`; for Rough/Low posts show "Send support" with the `accents.support` colours; sent state disables it (`.nudge-btn`) |
| Bar chart | 80 px tall, gap 6; per day a value label (10/700), a bar `height = max(avg/5, 4%)` in `moodColors[round(avg)].solid` (or `border` when no data), radius 4/4/2/2, and a day label (10, `textTertiary`) (`.bar-chart`) |
| Stat tile | Card with `stat` number and `caption` label, 2-column grid, gap 8 (`.stat-grid`) |
| Sheet | radius `lg` on top, padding 12/16/40, grabber 36x4 `borderStrong`, title 12/600 uppercase `textTertiary` tracking .5 (`.sheet`); use a `formSheet` route, not a custom modal |
| Toast | pill, `ink` bg, white 13/500 text, padding 9x18, 2.6 s; error variant uses `accents.danger`; lives above the tab bar; dismiss it when a sheet opens (`#toast`) |
| Tab bar | surface, top 1 px `border`, four tabs (Home, History, Streak, Me) with 22 px icons at stroke 1.7 and 10/500 labels, inactive `textTertiary`, active `brand`; centre "+" 48x48, radius `md`, brand bg, white plus (`.bottom-nav`, `.nav-fab`) |
| EmptyState / ErrorState | centred icon or face, heading, one line, the next action; ErrorState always has Retry (`.empty-feed`) |
| Toggle | use the platform `Switch` (web `.tgl` is 40x22) |

### Deliberate differences from the web screens

The built sign-in and onboarding screens differ from `public/` only here; say so in a PR description, and let the user overrule.

| Difference | Reason |
|---|---|
| No "Skip for now" on profile setup | a display name is required (`roadmap.md`, decisions) |
| Fields 46 pt and buttons 48 pt tall | touch targets: Apple's guideline is 44 pt |
| Helper text in `textSecondary` (the web uses `textTertiary`) | `textTertiary` is 2.3:1, decoration only |
| Errors appear inline in `accents.danger` (`#DC2626`), not as toasts in `#EF4444` | contrast (4.8:1 versus 3.8:1) and the message stays next to what caused it |
| The password offer is a `formSheet` opened after onboarding, with a Skip button | the web opened it as a bottom sheet about 400 ms after a code sign-in; here it queues behind the joy step |

## Icons and mood faces

`components/icon.tsx` and `components/mood-face.tsx` are templates (with tests). The icon set is the eleven
Feather-style icons the web uses: home, activity, plus, zap, user, chevron-left/right/down, log-out, refresh-cw,
share-2. To add one, copy its `<path>`/`<polyline>`/`<circle>`/`<line>` from `public/index.html` into the `ICONS`
map; stroke width is a prop (web: 1.7 in the tab bar, 2 to 2.5 elsewhere). Icons are decorative; the control that
holds them carries `accessibilityLabel`.

Mood faces are `MOOD_FACE` from `public/js/constants.js`, five 100x100 drawings inside one ink circle (r 34, stroke
3.5). Show them at 16 to 26 px inside a `moodColors[l].tint` container. Pass `labelled` when the face is the only
indication of the mood. The tear on level 1 (`#6BB5E8`) is the single blue in the set and stays inline.

## Off-palette colours and contrast facts

Measured (WCAG relative luminance). Reading text must be at least 4.5:1, large text (24 px, or 18.5 px bold) 3:1.

| Pair | Ratio | Verdict |
|---|---|---|
| `text` on background / surface | 12.7 / 13.7 | pass |
| `textSecondary` on background / surface | 5.0 / 5.4 | pass |
| `textTertiary` on background / surface | 2.3 / 2.4 | fail: never for text users must read |
| white on `brand`; `brand` on background | 7.2; 6.7 | pass |
| `moodColors[l].text` on its tint | L1 5.1, L2 3.8, L3 4.1, L4 5.5, L5 4.6 | L2 and L3 fail below 14 px bold: label those chips with `ink` (11.9 to 12.6) |
| white initials on avatar colours | 4.9, 3.3, 3.1, 2.9, 4.3, 3.5, 4.9, 4.2 | 6 of 8 fail at 13 px; darken about 15% or use bold 14 px+ if the designer agrees |

The web redesign left colours that are outside the Moodbloom palette, still in use. They are tokens in
`accents` (streak card orange, "Send support" blue, error red); the rest should not be carried over:

| Web value | Where | Native decision |
|---|---|---|
| `#FFF7ED` `#FED7AA` `#EA580C` `#C2410C` `#9A3412` | streak card and pill | keep as `accents.streak` (text pairs pass; `solid` only for 24 px+ numbers) |
| `#2563EB` `#EFF6FF` `#BFDBFE` | "Send support" nudge | keep as `accents.support` (4.75:1) |
| `#EF4444` | error toast, Sign Out label | use `accents.danger` `#DC2626` (4.8:1; `#EF4444` is 3.8:1) |
| `#22C55E` `#F59E0B` `#DB2777` `#D97706` (stat numbers) | history and streak stat tiles | do not carry over (2.3, 2.2, 4.6, 3.2 on white): use `brand`, `ink` or a mood colour |
| `#F97316` (nudge "sent") | nudge button | do not carry over (2.6:1); use `accents.support` sent state |
| `#F0FDF4` `#BBF7D0` | dev OTP hint | not shipped |

These are design calls, not bugs to fix silently: list the deviations in the PR description and let the user overrule.

## Feedback, motion, accessibility

- Pressed feedback: opacity .8 on buttons (the web's `:active`), use a `Pressable` style function.
- Haptics (`expo-haptics`, iOS): light impact on mood selection, success on a posted check-in, reaction tap. Nothing else.
- Motion is minimal, like the web (`transition .12s to .15s`). Skip Reanimated until a specific screen needs it.
- Every icon-only control has a label ("Refresh", "Sign out", "Check in"). The five mood tiles are a radio group with
  their names. The toast is announced (`accessibilityLiveRegion="polite"` on Android; `AccessibilityInfo.announceForAccessibility` on iOS).
- Check large system text on every screen: tab labels and chips may need to wrap or grow.
- Time is shown in the device's locale (`toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`); the web
  hard-codes `en-IN`.
