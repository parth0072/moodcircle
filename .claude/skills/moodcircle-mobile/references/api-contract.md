# API contract

The backend is the source of truth: `src/routes/*.js` and `src/controllers/*.js`. This file is a
snapshot of them at commit `a0de222` (2026-09-29), and the zod schemas in `assets/src/api/schemas/`
encode it. Do not trust either once the backend has changed: run

```bash
node .claude/skills/moodcircle-mobile/scripts/contract-check.mjs --project mobile
```

It starts a throwaway backend, drives every endpoint below through a two-user scenario, and fails when a
schema no longer matches a response or a documented error code changes (55 checks; verified passing on the
snapshot, and verified to fail when a schema is deliberately broken).

## Contents
- Conventions
- Endpoints
- Shapes
- Error codes and what the app does
- Quirks and gaps
- Backend changes the mobile app needs

## Conventions

- **Base URL**: `https://<host><BASE_PATH>/api`. `BASE_PATH` is empty locally and something like `/moodcircle` on the
  cPanel deployment, so `EXPO_PUBLIC_API_URL` must include it. There is no CORS middleware: native apps do not
  need it, and the web verification build uses a same-origin proxy instead.
- **Envelope**: success `{ "success": true, "data": ... }`, failure `{ "success": false, "message": "...", "code": "..." }`.
  The one exception is `GET /api/health`, which returns bare `{ "ok": true }`.
- **Auth**: `Authorization: Bearer <jwt>`. The JWT payload is `{ userId }`, expires in 7 days
  (`JWT_EXPIRES_IN`), and there is no refresh and no logout endpoint (sign-out is client-side).
- **Validation** (express-validator) fails with HTTP 422 `VALIDATION_ERROR` and only the FIRST message.
  Path ids (`:groupId`, `:moodId`, `:reactionId`) must be UUIDs or you get 422, not 404.
- **Dates**: `date` fields are `YYYY-MM-DD` in IST (UTC+5:30); `createdAt` is an ISO UTC timestamp. "Today" is the
  server's IST day.
- All ids are UUID strings.

## Endpoints

Auth column: `-` public, `T` needs the bearer token.

| Method and path | Auth | Body | Success `data` | Errors |
|---|---|---|---|---|
| `POST /auth/otp/request` | - | `{ email }` | `{ message, otp? }` | 422 |
| `POST /auth/otp/verify` | - | `{ email, otp }` (6-digit string) | `{ token, user }` | 400 `OTP_NOT_FOUND` `OTP_EXPIRED` `OTP_INVALID`, 422 |
| `POST /auth/password/login` | - | `{ email, password }` | `{ token, user }` | 401 `INVALID_CREDENTIALS`, 422 |
| `POST /auth/password/set` | T | `{ password }` (6+ chars) | `{ message, hasPassword }` | 422 |
| `GET /profile/me` | T | | `{ user }` | 401 |
| `PATCH /profile` | T | `{ name?, username?, avatar?, joyActivities? }` | `{ user }` | 409 `USERNAME_TAKEN`, 422 |
| `GET /groups` | T | | `{ groups: Group[] }` | |
| `GET /groups/overview` | T | | `{ groups: (Group + { members, today })[] }`: members (`id`, `name`, `username`) and today's posts (`userId`\|null, `emotion`, `createdAt`), newest first; never the words | |
| `GET /groups/preview?code=` | T | | `{ group: { id\|null, name, color, showNotes, createdByName\|null, memberCount, isMember } }`; `id` only for a member | 404 `INVALID_INVITE_CODE`, 422 |
| `POST /groups` | T | `{ name }` (1 to 60 chars), `color?` (`blue` `sage` `pink` `peach` `mint`), `showNotes?` | 201 `{ group }` | 422 |
| `POST /groups/join` | T | `{ inviteCode }` (case-insensitive), `autoShare?` | `{ group }` | 404 `INVALID_INVITE_CODE`, 409 `ALREADY_MEMBER` |
| `GET /groups/:groupId` | T | | `{ group, members: Member[] }` | 404 `GROUP_NOT_FOUND`, 403 `NOT_MEMBER` |
| `DELETE /groups/:groupId/leave` | T | | `{ message }` | 404 `GROUP_NOT_FOUND`, 403 `NOT_MEMBER` |
| `POST /groups/:groupId/moods` | T | `{ emotion` (the six) `or level 1..5, note? <=280, privateNote? <=500, isAnonymous? }`. A post that was shared automatically is replaced (200) rather than refused | 201 `{ mood: FeedItem }` | 409 `ALREADY_CHECKED_IN`, 404/403, 422 |
| `GET /groups/:groupId/moods/today` | T | | `{ feed: FeedItem[], vibeScore, checkedIn, totalMembers }` | 404/403 |
| `GET /groups/:groupId/moods/history?days=7\|30\|90` | T | | `{ history: FeedItem[], days }` | 422, 404/403 |
| `POST /moods/:moodId/reactions` | T | `{ type }` | 201 `{ reaction }` | 404 `MOOD_NOT_FOUND`, 403 `NOT_MEMBER`, 409 `DUPLICATE_REACTION`, 422 |
| `DELETE /moods/:moodId/reactions/:reactionId` | T | | `{ message }` | 404 `REACTION_NOT_FOUND`, 400 `MISMATCH`, 403 `FORBIDDEN` |
| `POST /groups/:groupId/nudge` | T | `{ targetUserId }` | 201 `{ nudge }` | 400 `SELF_NUDGE`, 403 `NOT_MEMBER`, 404 `GROUP_NOT_FOUND` `TARGET_NOT_MEMBER`, 429 `NUDGE_LIMIT` |
| `GET /streaks/me` | T | | `{ streak: { currentStreak, lastCheckInDate } }` | |
| `POST /entries` | T | `{ emotion, intensity 1..5, tags?, note?, date? }` (the person's own day) | 201 `{ entry }` | 422 `INVALID_DATE` |
| `GET /entries?from=&to=` | T | | `{ entries: Entry[] }` oldest first, at most 366 days | 422 `INVALID_RANGE` |
| `PATCH /entries/:id` | T | `{ emotion?, intensity?, tags?, note? }` | `{ entry }` | 404 `ENTRY_NOT_FOUND`, 422 |
| `DELETE /entries/:id` | T | | `{ message }` | 404 `ENTRY_NOT_FOUND` |
| `GET /entries/stats?date=` | T | | `{ stats: { total, currentStreak, topEmotion\|null, firstEntryDate\|null } }` | 422 |
| `GET /health` | - | | bare `{ ok: true }` | |

Also present but out of scope for the mobile app for now: `/private/*` (private pairs) and `/premium/*`
(Razorpay-based premium). Anything that sells premium inside an iOS app must use Apple In-App Purchase, so do not
port those routes as-is.

Reaction `type` is one of `sending_love`, `same`, `rooting_for_you`, `hang_in_there`, `so_happy_for_you`.
The web UI offers only the first three; keep parity first.

## Shapes

```
User      { id, email?, name|null, username|null, avatar|null, isPremium, hasPassword?, joyActivities: string[], joyOnboarded }
            auth responses include email and hasPassword; /profile responses do not (merge, never replace)
Group     { id, name, inviteCode (6 hex chars, upper case), createdBy, memberCount, isAdmin, color, showNotes, autoShare, createdAt }
            showNotes false = "mood only": other people's notes come back as ""; autoShare = the asker shares their daily mood
Member    { id, name|null, username|null, avatar|null }
FeedItem  { id, user, isOwn, level 1..5, emotion, note, isAnonymous, date, createdAt, reactions: Reaction[] }
            emotion is what the post was made with; for a website post (level only) it is the closest one
            user = { anonymous: true }  |  { id?, name|null, username|null, avatar|null }
Reaction  { id, type, userId, createdAt }          (POST returns it with moodId as well)
Entry     { id, emotion, intensity 1..5, tags: string[], note, date, createdAt, updatedAt }
Nudge     { id, fromUserId, toUserId, groupId, date, createdAt }
```

Facts about these shapes that are easy to get wrong (all checked by `contract-check.mjs`):
- `privateNote` is accepted on POST and never returned, not even to the author.
- An anonymous post has no author at all (`user: { anonymous: true }`), but `isOwn` is still true for its author.
  It therefore cannot be nudged.
- `vibeScore` is the mean of today's levels to one decimal, `null` when nobody has checked in. A post made with an
  emotion gets a level from it (joy 5, calm 4, meh 3, worry 2, sad 2, anger 1).
- "Share my check-ins" (`autoShare`): the server keeps a group's post for today in line with the person's latest
  journal entry of the day (emotion only, never the journal note), following edits and deletes, and never
  overriding a post the person wrote themselves. The app does nothing for this beyond sending `autoShare` on join.
- `history` contains the whole group's moods, oldest first; filter on `isOwn` for a personal graph.
- Saving `joyActivities` (even `[]`) sets `joyOnboarded: true`. At most 12 items (more is a 422); each is trimmed and
  cut to 60 characters, and blanks are dropped.
- A username is stored lower-case; the uniqueness check is case-insensitive.
- Usernames are 3 to 20 of letters, digits, underscore; names 1 to 40 chars.

## Error codes and what the app does

| Code | HTTP | Where | App behaviour |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | any authenticated call | the session is over: `endSession()`, land on sign-in. The only thing that signs out |
| `INVALID_CREDENTIALS` | 401 | password login | inline "Invalid email or password". NOT a sign-out (a login has no session to end) |
| `VALIDATION_ERROR` | 422 | forms | show `message` inline, keep the draft |
| `OTP_INVALID` / `OTP_EXPIRED` / `OTP_NOT_FOUND` | 400 | verify | "That code is wrong or expired" with resend |
| `USERNAME_TAKEN` | 409 | profile | inline on the username field |
| `INVALID_INVITE_CODE` | 404 | join | inline |
| `ALREADY_MEMBER` | 409 | join | "You are already in this group", then go to it |
| `ALREADY_CHECKED_IN` | 409 | post mood | refetch today's feed; the UI should not offer check-in when `isOwn` exists |
| `GROUP_NOT_FOUND` / `NOT_MEMBER` | 404 / 403 | any group call | refetch the groups list and clear the active group |
| `NUDGE_LIMIT` | 429 | nudge | "You already nudged <name> today"; disable the button |
| `SELF_NUDGE` / `TARGET_NOT_MEMBER` | 400 / 404 | nudge | UI must not offer it; refetch members |
| `DUPLICATE_REACTION` | 409 | react | treat as already reacted; refetch the feed |
| `MOOD_NOT_FOUND` / `REACTION_NOT_FOUND` / `MISMATCH` / `FORBIDDEN` | 404/400/403 | reactions | refetch the feed |
| `NETWORK_ERROR`, `HTTP_ERROR`, `INVALID_RESPONSE` | (client-made) | any | retry UI. Never a sign-out |

## Quirks and gaps

- **Email is normalised.** `normalizeEmail()` lower-cases and, for Gmail, strips dots and `+tags`
  (`Jane.Doe+x@gmail.com` becomes `janedoe@gmail.com`). Send what the user typed and use `user.email` from the
  response; do not assume it round-trips.
- **The OTP must be sent as a string.** The comparison is strict, so a JSON number fails with `OTP_INVALID`.
- **`otp` leaks in `POST /auth/otp/request`** whenever `NODE_ENV` is not `production`. The app never reads it
  (the schema omits it); only the verification scripts do.
- **No brute-force protection.** No rate limit on OTP request or verify, and a 6-digit code lives for 10 minutes.
- **Streak is not decayed on read.** `currentStreak` stays at its old value when the user skips days; treat it as 0
  when `lastCheckInDate` is before yesterday (IST) until the backend does it.
- **Nudges have no delivery.** `POST .../nudge` stores a row; there is no inbox endpoint, no push, no notification.
  The recipient never learns of it until we build that (see the roadmap).
- **Dead fields.** `phone` appears in some payloads from an earlier phone-login design; the schemas strip it.
- **No pagination.** History returns up to 90 days of the whole group in one response.
- **Sessions last 7 days** with no refresh, so a phone user gets signed out weekly unless the backend changes.
- **Dead Firebase code.** `src/utils/firebase-admin.js` requires `firebase-admin`, which is not a dependency, and
  nothing imports the file; `package-lock.json` still lists the package. Harmless until something imports it. Leave
  it alone in mobile work and mention it in a backend clean-up PR.

## Backend changes the mobile app needs

Do these as separate backend PRs, never bundled into an app slice, and run `contract-check.mjs` afterwards. The
list, with priority, is in `roadmap.md` ("Backend work").
