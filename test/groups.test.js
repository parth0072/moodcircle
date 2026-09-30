// Group circles, end to end: join preview, colour and notes setting, emotion posts, and "share my
// check-ins" (the real server on a free port with a throwaway database).
//   npm test

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
let server;
let tmp;
let base;
let counter = 0;

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function call(method, url, { token, body } = {}) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

// A new signed-in user (through the real OTP flow: the dev server echoes the code), optionally named.
// Every test uses its own users, so a journal entry in one test never shows up in another.
async function newUser(name) {
  counter += 1;
  const email = `user${counter}@example.com`;
  const requested = await call('POST', '/auth/otp/request', { body: { email } });
  const verified = await call('POST', '/auth/otp/verify', { body: { email, otp: requested.json.data.otp } });
  const token = verified.json.data.token;
  if (name) await call('PATCH', '/profile', { token, body: { name } });
  return token;
}

const createGroup = async (token, body = {}) =>
  (await call('POST', '/groups', { token, body: { name: 'Sunday Circle', ...body } })).json.data.group;
const join = (token, inviteCode, extra = {}) => call('POST', '/groups/join', { token, body: { inviteCode, ...extra } });
const post = (token, groupId, body) => call('POST', `/groups/${groupId}/moods`, { token, body });
const todaysFeed = async (token, groupId) => (await call('GET', `/groups/${groupId}/moods/today`, { token })).json.data.feed;
const logEntry = async (token, emotion) =>
  (await call('POST', '/entries', { token, body: { emotion, intensity: 3, note: 'private journal words' } })).json.data.entry;
const pause = () => new Promise((r) => setTimeout(r, 5)); // entries made in the same millisecond have no "latest"

before(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), 'moodcircle-groups-'));
  const port = await freePort();
  base = `http://127.0.0.1:${port}/api`;
  server = spawn('node', ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: path.join(tmp, 'test.db'),
      JWT_SECRET: 'test-only-secret',
      NODE_ENV: 'development',
      BASE_PATH: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
});

after(() => {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
});

// ── Creating and joining ──────────────────────────────────────────────────────

test('a new group has a colour and shows notes unless told otherwise', async () => {
  const alice = await newUser('Alice');
  const plain = await createGroup(alice);
  assert.equal(plain.color, 'blue');
  assert.equal(plain.showNotes, true);
  assert.equal(plain.autoShare, false);

  const chosen = await createGroup(alice, { color: 'mint', showNotes: false });
  assert.equal(chosen.color, 'mint');
  assert.equal(chosen.showNotes, false);

  const badColor = await call('POST', '/groups', { token: alice, body: { name: 'X', color: 'red' } });
  assert.equal(badColor.status, 422);
  const badNotes = await call('POST', '/groups', { token: alice, body: { name: 'X', showNotes: 'maybe' } });
  assert.equal(badNotes.status, 422);
});

test('a code can be previewed without joining', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice, { color: 'pink', showNotes: false });

  const seen = await call('GET', `/groups/preview?code=${group.inviteCode.toLowerCase()}`, { token: bob });
  assert.equal(seen.status, 200);
  assert.deepEqual(seen.json.data.group, {
    id: null, // a stranger does not get the id
    name: 'Sunday Circle',
    color: 'pink',
    showNotes: false,
    createdByName: 'Alice',
    memberCount: 1,
    isMember: false,
  });
  assert.equal((await call('GET', '/groups', { token: bob })).json.data.groups.length, 0, 'previewing must not join');

  const own = await call('GET', `/groups/preview?code=${group.inviteCode}`, { token: alice });
  assert.equal(own.json.data.group.isMember, true);
  assert.equal(own.json.data.group.id, group.id, 'a member gets the id, to open the group');
});

test('a preview says so for a wrong code, no code, or no sign-in', async () => {
  const bob = await newUser('Bob');
  const unknown = await call('GET', '/groups/preview?code=ZZZZZZ', { token: bob });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.code, 'INVALID_INVITE_CODE');
  assert.equal((await call('GET', '/groups/preview', { token: bob })).status, 422);
  assert.equal((await call('GET', '/groups/preview?code=ABC123')).status, 401);
});

test('joining by code is instant, ignores case, and only works once', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice);

  const joined = await join(bob, group.inviteCode.toLowerCase());
  assert.equal(joined.status, 200);
  assert.equal(joined.json.data.group.memberCount, 2);
  assert.equal(joined.json.data.group.autoShare, false);

  const again = await join(bob, group.inviteCode);
  assert.equal(again.status, 409);
  assert.equal(again.json.code, 'ALREADY_MEMBER');
  assert.equal((await join(bob, 'NOPE00')).status, 404);
});

// ── Posts: an emotion or a level ──────────────────────────────────────────────

test('a post is an emotion or a level, and either reads back as an emotion', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const outsider = await newUser('Cara');
  const group = await createGroup(alice);
  await join(bob, group.inviteCode);

  const app = await post(alice, group.id, { emotion: 'joy', note: 'hello' });
  assert.equal(app.status, 201);
  assert.equal(app.json.data.mood.level, 5);
  assert.equal(app.json.data.mood.emotion, 'joy');

  const website = await post(bob, group.id, { level: 4 });
  assert.equal(website.status, 201);
  assert.equal(website.json.data.mood.emotion, 'calm');

  const feed = await call('GET', `/groups/${group.id}/moods/today`, { token: alice });
  assert.equal(feed.json.data.vibeScore, 4.5); // (5 + 4) / 2: the vibe score still works from levels

  assert.equal((await post(outsider, group.id, { emotion: 'joy' })).status, 403);
  assert.equal((await post(alice, group.id, { emotion: 'sad' })).status, 409, 'one post a day still holds');
});

test('a post without an emotion or level, or with a wrong one, is refused', async () => {
  const alice = await newUser('Alice');
  const group = await createGroup(alice);
  const none = await post(alice, group.id, { note: 'just words' });
  assert.equal(none.status, 422);
  assert.match(none.json.message, /emotion or a mood level/);
  assert.equal((await post(alice, group.id, { emotion: 'happy' })).status, 422);
  assert.equal((await post(alice, group.id, { level: 6 })).status, 422);
});

test('a group set to "mood only" hides other people\'s words, but not from their author', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const quiet = await createGroup(alice, { name: 'Quiet', showNotes: false });
  const open = await createGroup(alice, { name: 'Open' });
  for (const g of [quiet, open]) {
    await join(bob, g.inviteCode);
    await post(alice, g.id, { emotion: 'sad', note: 'secret words' });
  }

  assert.equal((await todaysFeed(bob, quiet.id))[0].note, '');
  assert.equal((await todaysFeed(bob, quiet.id))[0].emotion, 'sad');
  assert.equal((await todaysFeed(bob, open.id))[0].note, 'secret words');
  assert.equal((await todaysFeed(alice, quiet.id))[0].note, 'secret words');

  const history = await call('GET', `/groups/${quiet.id}/moods/history?days=7`, { token: bob });
  assert.equal(history.json.data.history[0].note, '');
});

// ── The circles list ──────────────────────────────────────────────────────────

test('the overview lists each group with its members and what was posted today', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const one = await createGroup(alice, { name: 'One', color: 'sage' });
  await createGroup(alice, { name: 'Two' });
  await join(bob, one.inviteCode);
  await post(alice, one.id, { emotion: 'joy', note: 'words that must not leak' });
  await post(bob, one.id, { emotion: 'calm', isAnonymous: true });

  const overview = (await call('GET', '/groups/overview', { token: alice })).json.data.groups;
  assert.equal(overview.length, 2);
  const first = overview.find((g) => g.name === 'One');
  assert.equal(first.memberCount, 2);
  assert.equal(first.color, 'sage');
  assert.equal(first.isAdmin, true);
  assert.deepEqual(first.members.map((m) => m.name).sort(), ['Alice', 'Bob']);

  const aliceId = first.members.find((m) => m.name === 'Alice').id;
  const byEmotion = Object.fromEntries(first.today.map((t) => [t.emotion, t.userId]));
  assert.equal(byEmotion.joy, aliceId);
  assert.equal(byEmotion.calm, null, 'an anonymous post stays anonymous');
  assert.deepEqual(Object.keys(first.today[0]).sort(), ['createdAt', 'emotion', 'userId']);
  assert.equal(overview.find((g) => g.name === 'Two').today.length, 0);

  const bobsView = (await call('GET', '/groups/overview', { token: bob })).json.data.groups;
  assert.deepEqual(bobsView.map((g) => g.name), ['One']);
  assert.equal(bobsView[0].isAdmin, false);
});

// ── Share my check-ins ────────────────────────────────────────────────────────

test('joining with sharing on puts the day\'s journal mood in the group at once, without the note', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice);
  await logEntry(bob, 'worry');

  const joined = await join(bob, group.inviteCode, { autoShare: true });
  assert.equal(joined.json.data.group.autoShare, true);

  const feed = await todaysFeed(alice, group.id);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].user.name, 'Bob');
  assert.equal(feed[0].emotion, 'worry');
  assert.equal(feed[0].note, '', 'the journal note is private');
});

test('the shared mood follows the journal: the latest entry wins, edits change it, deleting removes it', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice);
  await join(bob, group.inviteCode, { autoShare: true });
  assert.equal((await todaysFeed(alice, group.id)).length, 0, 'nothing logged yet, nothing shared');

  const first = await logEntry(bob, 'joy');
  const shared = (await todaysFeed(alice, group.id))[0];
  assert.equal(shared.emotion, 'joy');
  await call('POST', `/moods/${shared.id}/reactions`, { token: alice, body: { type: 'sending_love' } });

  await call('PATCH', `/entries/${first.id}`, { token: bob, body: { emotion: 'calm' } });
  let feed = await todaysFeed(alice, group.id);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].emotion, 'calm');
  assert.equal(feed[0].id, shared.id, 'the same post is updated');
  assert.equal(feed[0].reactions.length, 1, 'so hugs on it are kept');

  await pause();
  const second = await logEntry(bob, 'sad');
  feed = await todaysFeed(alice, group.id);
  assert.equal(feed.length, 1, 'a day is still one post');
  assert.equal(feed[0].emotion, 'sad');

  await call('DELETE', `/entries/${second.id}`, { token: bob });
  assert.equal((await todaysFeed(alice, group.id))[0].emotion, 'calm', 'back to the one before');

  await call('DELETE', `/entries/${first.id}`, { token: bob });
  assert.equal((await todaysFeed(alice, group.id)).length, 0, 'nothing logged, nothing shared');
});

test('sharing only happens in the groups it was switched on for', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const sharing = await createGroup(alice, { name: 'Sharing' });
  const quiet = await createGroup(alice, { name: 'Quiet' });
  await join(bob, sharing.inviteCode, { autoShare: true });
  await join(bob, quiet.inviteCode);

  await logEntry(bob, 'joy');
  assert.equal((await todaysFeed(alice, sharing.id)).length, 1);
  assert.equal((await todaysFeed(alice, quiet.id)).length, 0);
});

test('writing your own post replaces the automatic one, and then it stays as written', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice);
  await join(bob, group.inviteCode, { autoShare: true });
  const entry = await logEntry(bob, 'joy');

  const own = await post(bob, group.id, { emotion: 'sad', note: 'my own words' });
  assert.equal(own.status, 200, 'replaced, not refused');
  let feed = await todaysFeed(alice, group.id);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].emotion, 'sad');
  assert.equal(feed[0].note, 'my own words');

  await call('PATCH', `/entries/${entry.id}`, { token: bob, body: { emotion: 'calm' } });
  feed = await todaysFeed(alice, group.id);
  assert.equal(feed[0].emotion, 'sad', 'the journal no longer overrides a post the person wrote');
  assert.equal((await post(bob, group.id, { emotion: 'joy' })).status, 409);
});

test('leaving a group turns sharing off for it', async () => {
  const alice = await newUser('Alice');
  const bob = await newUser('Bob');
  const group = await createGroup(alice);
  await join(bob, group.inviteCode, { autoShare: true });
  await call('DELETE', `/groups/${group.id}/leave`, { token: bob });

  const rejoined = await join(bob, group.inviteCode);
  assert.equal(rejoined.json.data.group.autoShare, false);
  await logEntry(bob, 'joy');
  assert.equal((await todaysFeed(alice, group.id)).length, 0);
});
