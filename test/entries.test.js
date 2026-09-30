// Personal mood entries, end to end: the real server on a free port with a throwaway database.
//   npm test

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { addDays, todayUTC } = require('../src/utils/dates');

const root = path.join(__dirname, '..');
let server;
let tmp;
let base;
let alice;
let bob;

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

// Signs in through the real OTP flow (the dev server echoes the code).
async function signIn(email) {
  const requested = await call('POST', '/auth/otp/request', { body: { email } });
  const verified = await call('POST', '/auth/otp/verify', { body: { email, otp: requested.json.data.otp } });
  return verified.json.data.token;
}

before(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), 'moodcircle-test-'));
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
  alice = await signIn('alice@example.com');
  bob = await signIn('bob@example.com');
});

after(() => {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
});

const today = todayUTC();
const yesterday = addDays(today, -1);
const good = { emotion: 'joy', intensity: 4, tags: ['Friends', 'Music'], note: 'Coffee with Sam' };

test('every route needs a token', async () => {
  for (const [method, url] of [
    ['POST', '/entries'],
    ['GET', `/entries?from=${today}&to=${today}`],
    ['GET', `/entries/stats?date=${today}`],
    ['PATCH', '/entries/6f1c2c1e-6c1a-4b8e-9d55-2f4d1f0c9a10'],
    ['DELETE', '/entries/6f1c2c1e-6c1a-4b8e-9d55-2f4d1f0c9a10'],
  ]) {
    const { status, json } = await call(method, url);
    assert.equal(status, 401, `${method} ${url}`);
    assert.equal(json.code, 'UNAUTHORIZED');
  }
});

test('create returns the entry with a day, and normalises tags and note', async () => {
  const { status, json } = await call('POST', '/entries', {
    token: alice,
    body: { emotion: 'calm', intensity: 2, tags: [' Sleep ', 'sleep', 'Food'], note: '  slept well  ', date: today },
  });
  assert.equal(status, 201);
  const { entry } = json.data;
  assert.equal(entry.emotion, 'calm');
  assert.equal(entry.intensity, 2);
  assert.deepEqual(entry.tags, ['Sleep', 'Food']);
  assert.equal(entry.note, 'slept well');
  assert.equal(entry.date, today);
  assert.match(entry.id, /^[0-9a-f-]{36}$/);
  assert.ok(entry.createdAt && entry.updatedAt);
  assert.equal('userId' in entry, false);
});

test('create defaults tags and note, and the day when none is sent', async () => {
  const { status, json } = await call('POST', '/entries', { token: alice, body: { emotion: 'meh', intensity: 3 } });
  assert.equal(status, 201);
  assert.deepEqual(json.data.entry.tags, []);
  assert.equal(json.data.entry.note, '');
  assert.match(json.data.entry.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('create rejects bad input with the first message', async () => {
  const cases = [
    [{ ...good, emotion: 'happy' }, /Emotion must be one of/],
    [{ ...good, emotion: undefined }, /Emotion must be one of/],
    [{ ...good, intensity: 0 }, /Intensity must be 1–5/],
    [{ ...good, intensity: 6 }, /Intensity must be 1–5/],
    [{ ...good, intensity: 'strong' }, /Intensity must be 1–5/],
    [{ ...good, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }, /Up to 8 tags/],
    [{ ...good, tags: ['x'.repeat(21)] }, /Each tag must be 1–20/],
    [{ ...good, tags: [''] }, /Each tag must be 1–20/],
    [{ ...good, tags: 'Friends' }, /Up to 8 tags/],
    [{ ...good, note: 'n'.repeat(501) }, /Note max 500/],
    [{ ...good, date: '30-09-2026' }, /date must be a date like/],
    [{ ...good, date: '2026-02-31' }, /date must be a date like/],
  ];
  for (const [body, message] of cases) {
    const { status, json } = await call('POST', '/entries', { token: alice, body });
    assert.equal(status, 422, JSON.stringify(body));
    assert.equal(json.code, 'VALIDATION_ERROR');
    assert.match(json.message, message);
  }
});

test('create only accepts today (within a day of UTC, for any time zone)', async () => {
  for (const date of [addDays(today, -2), addDays(today, 2), '1999-01-01']) {
    const { status, json } = await call('POST', '/entries', { token: alice, body: { ...good, date } });
    assert.equal(status, 422, date);
    assert.equal(json.code, 'INVALID_DATE');
  }
  for (const date of [yesterday, today, addDays(today, 1)]) {
    const { status } = await call('POST', '/entries', { token: alice, body: { ...good, date } });
    assert.equal(status, 201, date);
  }
});

test('list returns only your entries in the range, oldest first', async () => {
  const carol = await signIn('carol@example.com');
  await call('POST', '/entries', { token: carol, body: { emotion: 'sad', intensity: 1, date: yesterday } });
  await call('POST', '/entries', { token: carol, body: { emotion: 'joy', intensity: 5, date: today } });
  await call('POST', '/entries', { token: carol, body: { emotion: 'calm', intensity: 3, date: today } });
  await call('POST', '/entries', { token: bob, body: { emotion: 'anger', intensity: 5, date: today } });

  const { status, json } = await call('GET', `/entries?from=${yesterday}&to=${today}`, { token: carol });
  assert.equal(status, 200);
  const list = json.data.entries;
  assert.deepEqual(list.map((e) => e.emotion), ['sad', 'joy', 'calm']);
  assert.deepEqual(list.map((e) => e.date), [yesterday, today, today]);

  const onlyToday = await call('GET', `/entries?from=${today}&to=${today}`, { token: carol });
  assert.deepEqual(onlyToday.json.data.entries.map((e) => e.emotion), ['joy', 'calm']);

  const empty = await call('GET', `/entries?from=2020-01-01&to=2020-01-31`, { token: carol });
  assert.deepEqual(empty.json.data.entries, []);
});

test('list validates the range', async () => {
  const bad = [
    [`/entries?to=${today}`, 422, 'VALIDATION_ERROR'],
    [`/entries?from=${today}`, 422, 'VALIDATION_ERROR'],
    [`/entries?from=nope&to=${today}`, 422, 'VALIDATION_ERROR'],
    [`/entries?from=${today}&to=${yesterday}`, 422, 'INVALID_RANGE'],
    [`/entries?from=${addDays(today, -366)}&to=${today}`, 422, 'INVALID_RANGE'],
  ];
  for (const [url, status, code] of bad) {
    const res = await call('GET', url, { token: alice });
    assert.equal(res.status, status, url);
    assert.equal(res.json.code, code, url);
  }
  const widest = await call('GET', `/entries?from=${addDays(today, -365)}&to=${today}`, { token: alice });
  assert.equal(widest.status, 200);
});

test('update changes the given fields only, and never the day', async () => {
  const created = await call('POST', '/entries', { token: alice, body: { ...good, date: yesterday } });
  const { id } = created.json.data.entry;

  const patched = await call('PATCH', `/entries/${id}`, { token: alice, body: { intensity: 5, note: ' better ' } });
  assert.equal(patched.status, 200);
  const { entry } = patched.json.data;
  assert.equal(entry.intensity, 5);
  assert.equal(entry.note, 'better');
  assert.equal(entry.emotion, 'joy');
  assert.deepEqual(entry.tags, ['Friends', 'Music']);
  assert.equal(entry.date, yesterday);

  const cleared = await call('PATCH', `/entries/${id}`, { token: alice, body: { tags: [], emotion: 'calm' } });
  assert.deepEqual(cleared.json.data.entry.tags, []);
  assert.equal(cleared.json.data.entry.emotion, 'calm');
  assert.equal(cleared.json.data.entry.note, 'better');

  const dayIgnored = await call('PATCH', `/entries/${id}`, { token: alice, body: { date: today, note: 'x' } });
  assert.equal(dayIgnored.json.data.entry.date, yesterday);
});

test('update rejects empty and invalid changes', async () => {
  const { id } = (await call('POST', '/entries', { token: alice, body: good })).json.data.entry;
  const empty = await call('PATCH', `/entries/${id}`, { token: alice, body: {} });
  assert.equal(empty.status, 422);
  assert.match(empty.json.message, /Nothing to update/);
  const bad = await call('PATCH', `/entries/${id}`, { token: alice, body: { intensity: 9 } });
  assert.equal(bad.status, 422);
  const badId = await call('PATCH', '/entries/not-a-uuid', { token: alice, body: { note: 'x' } });
  assert.equal(badId.status, 422);
  assert.match(badId.json.message, /Invalid entry ID/);
});

test('nobody else can read, change or delete your entry', async () => {
  const { id } = (await call('POST', '/entries', { token: alice, body: good })).json.data.entry;

  const seen = await call('GET', `/entries?from=${addDays(today, -1)}&to=${addDays(today, 1)}`, { token: bob });
  assert.equal(seen.json.data.entries.some((e) => e.id === id), false);

  const patched = await call('PATCH', `/entries/${id}`, { token: bob, body: { note: 'mine now' } });
  assert.equal(patched.status, 404);
  assert.equal(patched.json.code, 'ENTRY_NOT_FOUND');

  const deleted = await call('DELETE', `/entries/${id}`, { token: bob });
  assert.equal(deleted.status, 404);
  assert.equal(deleted.json.code, 'ENTRY_NOT_FOUND');

  const still = await call('GET', `/entries?from=${addDays(today, -1)}&to=${addDays(today, 1)}`, { token: alice });
  assert.equal(still.json.data.entries.find((e) => e.id === id).note, good.note);
});

test('delete removes the entry once', async () => {
  const { id } = (await call('POST', '/entries', { token: alice, body: good })).json.data.entry;
  const first = await call('DELETE', `/entries/${id}`, { token: alice });
  assert.equal(first.status, 200);
  assert.equal(first.json.success, true);
  const again = await call('DELETE', `/entries/${id}`, { token: alice });
  assert.equal(again.status, 404);
  assert.equal(again.json.code, 'ENTRY_NOT_FOUND');
});

test('stats: a new user has nothing', async () => {
  const dave = await signIn('dave@example.com');
  const { status, json } = await call('GET', `/entries/stats?date=${today}`, { token: dave });
  assert.equal(status, 200);
  assert.deepEqual(json.data.stats, { total: 0, currentStreak: 0, topEmotion: null, firstEntryDate: null });
});

test('stats: total, streak, top emotion and first day', async () => {
  const erin = await signIn('erin@example.com');
  await call('POST', '/entries', { token: erin, body: { emotion: 'calm', intensity: 3, date: yesterday } });
  await call('POST', '/entries', { token: erin, body: { emotion: 'joy', intensity: 3, date: today } });
  await call('POST', '/entries', { token: erin, body: { emotion: 'calm', intensity: 2, date: today } });

  const { json } = await call('GET', `/entries/stats?date=${today}`, { token: erin });
  assert.deepEqual(json.data.stats, { total: 3, currentStreak: 2, topEmotion: 'calm', firstEntryDate: yesterday });

  const badDate = await call('GET', '/entries/stats', { token: erin });
  assert.equal(badDate.status, 422);
});

test('stats: the streak survives a day with no entry yet, and ends after that', async () => {
  const finn = await signIn('finn@example.com');
  await call('POST', '/entries', { token: finn, body: { emotion: 'meh', intensity: 3, date: yesterday } });

  const stillAlive = await call('GET', `/entries/stats?date=${today}`, { token: finn });
  assert.equal(stillAlive.json.data.stats.currentStreak, 1);

  const ended = await call('GET', `/entries/stats?date=${addDays(today, 1)}&x=1`, { token: finn });
  assert.equal(ended.json.data.stats.currentStreak, 0);
});
