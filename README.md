# MoodCircle API

A Node.js REST API for a group mood tracking app. Users join private groups, post a daily mood (1–5), react to friends' moods, send nudges, and track streaks.

---

## Setup

```bash
cp .env.example .env      # fill in JWT_SECRET and RAZORPAY_KEY_SECRET
npm install
npm run dev               # nodemon, hot-reload
npm start                 # production
npm test                  # personal-entries API tests (starts its own server and database)
```

The server starts on `http://localhost:3000`.  
The frontend (`public/index.html`) is served at `/`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `OTP_EXPIRES_MINUTES` | OTP validity window (default 10) |
| `RAZORPAY_KEY_SECRET` | Razorpay webhook signing secret |

---

## Response Format

All responses follow a consistent envelope:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "message": "...", "code": "ERROR_CODE" }
```

---

## API Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/otp/request` | Send OTP to an email address |
| POST | `/api/auth/otp/verify` | Verify OTP and receive a JWT |

**Request — OTP request**
```json
{ "email": "you@example.com" }
```

**Request — OTP verify**
```json
{ "email": "you@example.com", "otp": "123456" }
```

**Response — OTP verify**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "...", "isPremium": false }
}
```

---

### Groups

All group routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups` | Create a group, get a 6-char invite code |
| POST | `/api/groups/join` | Join a group using an invite code |
| GET | `/api/groups/preview?code=A3F9C1` | See what a code opens (name, colour, creator, member count) without joining |
| GET | `/api/groups/overview` | Your groups with their members and what was posted today (one call for a groups screen) |
| DELETE | `/api/groups/:groupId/leave` | Leave a group |
| GET | `/api/groups/:groupId` | Get group details and full member list |

**Request — create group** (`color` and `showNotes` are optional)
```json
{ "name": "Close Friends", "color": "sage", "showNotes": false }
```

**Request — join group** (`autoShare` is optional)
```json
{ "inviteCode": "A3F9C1", "autoShare": true }
```

**Response — preview** (`createdByName` is `null` when the creator has no name; `id` is `null` unless you are already a member)
```json
{ "group": { "id": null, "name": "Close Friends", "color": "sage", "showNotes": false, "createdByName": "Kabir", "memberCount": 6, "isMember": false } }
```

Every group in a response also carries `color`, `showNotes` and `autoShare` (for the person asking).

- `color` is one of `blue` (default), `sage`, `pink`, `peach`, `mint`.
- `showNotes: false` makes a "mood only" group: other members see each person's mood and time but not their words. The
  author still sees their own note. Groups made before this setting show notes.
- `autoShare: true` ("Share my check-ins here") makes the group show the latest thing the member logged today in their
  [personal journal](#personal-entries-the-moodbloom-journal), and nothing on a day they logged nothing. It follows edits and
  deletes of those entries, shares only the emotion (never the journal note), and never overrides a post the member
  wrote themselves. It is switched on when joining and off again when leaving.
- `GET /api/groups/overview` returns, for each group, everything above plus `members` (`id`, `name`, `username`) and `today`
  (one item per post today: `userId` (`null` when anonymous), `emotion`, `createdAt`), newest first.

---

### Mood Feed

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups/:groupId/moods` | Post today's mood (once per day per group) |
| GET | `/api/groups/:groupId/moods/today` | Get today's feed + vibe score |
| GET | `/api/groups/:groupId/moods/history?days=7` | Mood history (7 / 30 / 90 days) |

**Request — post mood** (send an `emotion` — `joy`, `calm`, `sad`, `worry`, `anger` or `meh` — or a `level` from 1 to 5)
```json
{
  "emotion": "calm",
  "note": "Feeling great today!",
  "privateNote": "Actually stressed but hiding it",
  "isAnonymous": false
}
```

Every post is stored with a `level` (for the vibe score); with an `emotion` it is worked out as joy 5, calm 4, meh 3, worry 2,
sad 2, anger 1. Every feed item has both `level` and `emotion`; for a post made with only a level, `emotion` is the closest
one (5 joy, 4 calm, 3 meh, 2 worry, 1 sad). A post that was shared automatically (see `autoShare`) is replaced, not refused,
when the member posts their own that day.

**Response — today feed**
```json
{
  "feed": [ ... ],
  "vibeScore": 3.8,
  "checkedIn": 5,
  "totalMembers": 8
}
```

> `privateNote` is stored but **never** returned in any API response.  
> Anonymous posts hide the user identity in all feed responses.  
> In a group with `showNotes: false`, `note` is an empty string on other people's posts.

---

### Reactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/moods/:moodId/reactions` | React to a mood post |
| DELETE | `/api/moods/:moodId/reactions/:reactionId` | Remove your reaction |

**Allowed reaction types:** `sending_love`, `same`, `rooting_for_you`, `hang_in_there`, `so_happy_for_you`

**Request — add reaction**
```json
{ "type": "sending_love" }
```

---

### Nudge

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/groups/:groupId/nudge` | Send a "thinking of you" nudge (max 1 per person per day) |

**Request**
```json
{ "targetUserId": "<uuid>" }
```

---

### Streaks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/streaks/me` | Get your current streak and last check-in date |

**Response**
```json
{
  "streak": {
    "currentStreak": 12,
    "lastCheckInDate": "2026-05-14"
  }
}
```

> Streak increments when you post a mood in any group. Resets if a day is skipped.

---

### Personal Entries *(the Moodbloom journal)*

A private mood journal, separate from group moods: an emotion, how strong it was, optional tags and a note. Only the
owner can see, change or delete an entry. All routes require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/entries` | Log an entry (as many per day as you like) |
| GET | `/api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD` | Your entries in a range of days, oldest first (at most 366 days) |
| PATCH | `/api/entries/:id` | Change `emotion`, `intensity`, `tags` or `note` (the day never changes) |
| DELETE | `/api/entries/:id` | Delete an entry |
| GET | `/api/entries/stats?date=YYYY-MM-DD` | Totals for the profile: check-ins, streak, top emotion, first day |

**Request — log an entry**
```json
{
  "emotion": "joy",
  "intensity": 4,
  "tags": ["Friends", "Music"],
  "note": "Coffee with Sam",
  "date": "2026-09-30"
}
```

- `emotion`: `joy`, `calm`, `sad`, `worry`, `anger` or `meh`. `intensity`: 1–5. `tags`: up to 8, each 1–20 characters
  (trimmed, duplicates ignoring case removed). `note`: up to 500 characters.
- `date` is the user's own local day. The server has no time zone for a user, so the app sends it. It is optional (default:
  today in IST) and must be within a day of UTC, so only "today" can be logged. Wrong values return `INVALID_DATE`.
- Errors: `VALIDATION_ERROR` (422, first message only), `INVALID_DATE` and `INVALID_RANGE` (422), `ENTRY_NOT_FOUND` (404, also
  for another user's entry).

**Response — entry**
```json
{
  "entry": {
    "id": "…", "emotion": "joy", "intensity": 4, "tags": ["Friends", "Music"], "note": "Coffee with Sam",
    "date": "2026-09-30", "createdAt": "2026-09-30T15:12:00.000Z", "updatedAt": "2026-09-30T15:12:00.000Z"
  }
}
```

**Response — stats**
```json
{ "stats": { "total": 148, "currentStreak": 12, "topEmotion": "calm", "firstEntryDate": "2026-03-04" } }
```

> The streak counts consecutive days with an entry, up to 400 days back. It is still alive when today has no entry yet but
> yesterday does. It is separate from the group streak above. Deleting a user account must also delete their entries.

---

### Private Mode *(Premium only)*

These routes return `403` for non-premium users.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/private/pairs` | Create a private 1-on-1 mood pair |
| POST | `/api/private/pairs/:pairId/moods` | Post mood to a private pair |
| GET | `/api/private/pairs/:pairId/moods` | View private pair feed |

**Request — create pair**
```json
{ "targetUserId": "<uuid>" }
```

**Request — post private mood**
```json
{ "level": 3, "note": "Feeling okay today" }
```

---

### Premium

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/premium/verify` | Verify Razorpay payment and unlock premium |
| GET | `/api/premium/status` | Check current premium status |

**Request — verify payment**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "<hmac-sha256>"
}
```

---

## Project Structure

```
src/
├── app.js                   # Express app + route mounting
├── stores/
│   ├── index.js             # In-memory data stores (swap with DB later)
│   └── entries.js           # Personal entries: a real SQLite table with an index
├── utils/
│   ├── response.js          # ok() / fail() helpers
│   ├── otp.js               # OTP generation + dispatch
│   ├── timezone.js          # IST date helpers
│   ├── dates.js             # Calendar-day helpers for personal entries
│   ├── entry-stats.js       # Streak for personal entries
│   └── streak.js            # Streak update + read logic
├── middleware/
│   ├── auth.middleware.js   # JWT verification
│   ├── premium.middleware.js# Premium gate
│   └── validate.middleware.js # express-validator error handler
├── controllers/
│   ├── auth.controller.js
│   ├── group.controller.js
│   ├── mood.controller.js
│   ├── reaction.controller.js
│   ├── nudge.controller.js
│   ├── streak.controller.js
│   ├── private.controller.js
│   ├── premium.controller.js
│   └── entry.controller.js
└── routes/
    ├── auth.routes.js
    ├── group.routes.js
    ├── mood.routes.js
    ├── reaction.routes.js
    ├── nudge.routes.js
    ├── streak.routes.js
    ├── private.routes.js
    ├── premium.routes.js
    └── entry.routes.js
test/                        # npm test (Node's built-in test runner, real server, throwaway database)
public/
└── index.html               # Frontend SPA
```

---

## Notes

- **Storage** — all data is in-memory. Restarting the server resets everything. Replace `src/stores/index.js` Maps with a DB adapter to persist data.
- **OTP delivery** — `src/utils/otp.js` logs the OTP to the console in development. Wire in Twilio / MSG91 for production.
- **IST timezone** — daily limits (one mood per day, nudge limits, streaks) all use IST (`UTC+5:30`).
- **Razorpay** — set `RAZORPAY_KEY_SECRET` in `.env` to enable real payment verification.
