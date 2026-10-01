// The journal (notes, memories and photos), end to end: the real server on a free port with a
// throwaway database.
//   npm test

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startServer } = require('./support/server');

let api;
const call = (...args) => api.call(...args);
const newUser = (...args) => api.newUser(...args);

before(async () => {
  api = await startServer({ PHOTO_MAX_BYTES: '2048' });
});
after(() => api.stop());

// Bytes that look like each image type to the server (it reads the first bytes, not the whole file).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 7)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(200, 7)]);

async function upload(token, bytes, { type = 'image/jpeg', query = '' } = {}) {
  const res = await fetch(`${api.base}/journal/photos${query}`, {
    method: 'POST',
    headers: { 'content-type': type, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: bytes,
  });
  return { status: res.status, json: await res.json() };
}

const photo = async (user, bytes = JPEG) => (await upload(user.token, bytes)).json.data.photo;
const write = (user, body = {}) =>
  call('POST', '/journal', {
    token: user.token,
    body: { type: 'note', emotion: 'sad', title: 'Couldn’t sleep again', body: 'Kept replaying the meeting.', ...body },
  });
const entryOf = async (user, body) => (await write(user, body)).json.data.entry;
const pause = () => new Promise((r) => setTimeout(r, 5)); // entries made in the same millisecond have no order

// Two people in one group: the only way to be able to share with each other.
async function friends(nameA, nameB) {
  const a = await newUser(nameA);
  const b = await newUser(nameB);
  const group = (await call('POST', '/groups', { token: a.token, body: { name: 'Sunday Circle' } })).json.data.group;
  await call('POST', '/groups/join', { token: b.token, body: { inviteCode: group.inviteCode } });
  return [a, b];
}

const share = (owner, entryId, recipients, extra = {}) =>
  call('PUT', `/journal/${entryId}/shares`, { token: owner.token, body: { recipientIds: recipients.map((r) => r.id), ...extra } });

test('every route needs a login, except a photo link that carries its own proof', async () => {
  for (const [method, url] of [['GET', '/journal'], ['POST', '/journal'], ['GET', '/journal/people'], ['POST', '/journal/photos']]) {
    const res = await call(method, url);
    assert.equal(res.status, 401, `${method} ${url}`);
    assert.equal(res.json.code, 'UNAUTHORIZED');
  }
  const someone = await newUser();
  const p = await photo(someone);
  assert.equal((await fetch(`${api.base}${p.url}`)).status, 200); // no Authorization header
});

test('writes a note and a memory and reads them back', async () => {
  const user = await newUser('Aria');
  const note = await write(user);
  assert.equal(note.status, 201);
  assert.deepEqual(
    { ...note.json.data.entry, id: undefined, createdAt: undefined, updatedAt: undefined, owner: undefined },
    {
      id: undefined,
      type: 'note',
      emotion: 'sad',
      title: 'Couldn’t sleep again',
      excerpt: 'Kept replaying the meeting.',
      createdAt: undefined,
      updatedAt: undefined,
      isMine: true,
      owner: undefined,
      photos: [],
      photoCount: 0,
      sharedWith: [],
      sharedMessage: null,
      loves: { count: 0, mine: false },
      replyCount: 0,
      body: 'Kept replaying the meeting.',
      replies: [],
    }
  );
  assert.deepEqual(note.json.data.entry.owner, { id: user.id, name: 'Aria' });

  const memory = await entryOf(user, { type: 'memory', emotion: 'joy', title: '  Beach day  ', body: '' });
  assert.equal(memory.title, 'Beach day'); // trimmed
  assert.equal(memory.body, '');

  const got = await call('GET', `/journal/${note.json.data.entry.id}`, { token: user.token });
  assert.equal(got.status, 200);
  assert.equal(got.json.data.entry.body, 'Kept replaying the meeting.');
});

test('rejects what an entry cannot be', async () => {
  const user = await newUser();
  const bad = async (body) => {
    const res = await write(user, body);
    assert.equal(res.status, 422, JSON.stringify(body));
    assert.equal(res.json.code, 'VALIDATION_ERROR');
  };
  await bad({ type: 'diary' });
  await bad({ emotion: 'happy' });
  await bad({ title: '' });
  await bad({ title: '   ' });
  await bad({ title: 'x'.repeat(81) });
  await bad({ body: 'x'.repeat(5001) });
  await bad({ photoIds: Array.from({ length: 7 }, () => crypto.randomUUID()) });
  await bad({ photoIds: ['not-an-id'] });

  const missing = await call('POST', '/journal', { token: user.token, body: { type: 'note' } });
  assert.equal(missing.status, 422);
});

test('changes an entry, and rejects an empty change', async () => {
  const user = await newUser();
  const entry = await entryOf(user);
  const changed = await call('PATCH', `/journal/${entry.id}`, {
    token: user.token,
    body: { type: 'memory', emotion: 'calm', title: 'Better now', body: 'Slept eight hours.' },
  });
  assert.equal(changed.status, 200);
  assert.deepEqual(
    [changed.json.data.entry.type, changed.json.data.entry.emotion, changed.json.data.entry.title, changed.json.data.entry.body],
    ['memory', 'calm', 'Better now', 'Slept eight hours.']
  );
  assert.equal(changed.json.data.entry.createdAt, entry.createdAt);

  const onlyTitle = await call('PATCH', `/journal/${entry.id}`, { token: user.token, body: { title: 'Only the title' } });
  assert.equal(onlyTitle.json.data.entry.body, 'Slept eight hours.'); // the rest stays

  const nothing = await call('PATCH', `/journal/${entry.id}`, { token: user.token, body: {} });
  assert.equal(nothing.status, 422);
});

test('deletes an entry for good', async () => {
  const user = await newUser();
  const entry = await entryOf(user);
  assert.equal((await call('DELETE', `/journal/${entry.id}`, { token: user.token })).status, 200);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: user.token })).status, 404);
  assert.equal((await call('DELETE', `/journal/${entry.id}`, { token: user.token })).json.code, 'JOURNAL_NOT_FOUND');
  assert.deepEqual((await call('GET', '/journal', { token: user.token })).json.data.entries, []);
});

test("nobody else can see, change or delete a person's entry", async () => {
  const [owner, other] = await friends('Aria', 'Kabir');
  const entry = await entryOf(owner);
  const id = entry.id;
  for (const [method, url, body] of [
    ['GET', `/journal/${id}`],
    ['PATCH', `/journal/${id}`, { title: 'Mine now' }],
    ['DELETE', `/journal/${id}`],
    ['PUT', `/journal/${id}/shares`, { recipientIds: [other.id] }],
    ['PUT', `/journal/${id}/love`],
    ['POST', `/journal/${id}/replies`, { body: 'hello' }],
  ]) {
    const res = await call(method, url, { token: other.token, body });
    assert.equal(res.status, 404, `${method} ${url}`); // "not found", never "forbidden": it is private
    assert.equal(res.json.code, 'JOURNAL_NOT_FOUND');
  }
  assert.deepEqual((await call('GET', '/journal', { token: other.token })).json.data.entries, []);
  assert.equal((await call('GET', `/journal/${id}`, { token: owner.token })).json.data.entry.title, entry.title);
});

test('lists newest first, filters by type, searches, and pages', async () => {
  const user = await newUser();
  const titles = ['First', 'Second', 'Third', 'Fourth'];
  for (const [i, title] of titles.entries()) {
    await entryOf(user, { title, type: i % 2 ? 'memory' : 'note', body: i === 2 ? '100% sure the BEACH was great' : 'plain' });
    await pause();
  }
  const list = async (query = '') => (await call('GET', `/journal${query}`, { token: user.token })).json.data;
  assert.deepEqual((await list()).entries.map((e) => e.title), ['Fourth', 'Third', 'Second', 'First']);
  assert.deepEqual((await list('?type=memory')).entries.map((e) => e.title), ['Fourth', 'Second']);
  assert.deepEqual((await list('?q=beach')).entries.map((e) => e.title), ['Third']); // any case, in the text
  assert.deepEqual((await list('?q=SECOND')).entries.map((e) => e.title), ['Second']); // in the title
  assert.deepEqual((await list('?q=100%25')).entries.map((e) => e.title), ['Third']); // % is a character, not a wildcard
  assert.deepEqual((await list('?q=%25')).entries.map((e) => e.title), ['Third']);
  assert.deepEqual((await list('?q=nothing')).entries, []);

  const first = await list('?limit=3');
  assert.deepEqual(first.entries.map((e) => e.title), ['Fourth', 'Third', 'Second']);
  assert.equal(first.nextBefore, first.entries[2].createdAt);
  const second = await list(`?limit=3&before=${encodeURIComponent(first.nextBefore)}`);
  assert.deepEqual(second.entries.map((e) => e.title), ['First']);
  assert.equal(second.nextBefore, null);

  for (const bad of ['?type=diary', '?limit=0', '?limit=51', '?before=yesterday', `?q=${'x'.repeat(101)}`]) {
    assert.equal((await call('GET', `/journal${bad}`, { token: user.token })).status, 422, bad);
  }
});

test('the list shows a short excerpt, the entry itself the whole text', async () => {
  const user = await newUser();
  const long = `${'word '.repeat(80)}end`;
  const entry = await entryOf(user, { body: long });
  const [listed] = (await call('GET', '/journal', { token: user.token })).json.data.entries;
  assert.ok(listed.excerpt.length <= 160 && listed.excerpt.endsWith('…'));
  assert.equal(listed.body, undefined);
  assert.equal(listed.replies, undefined);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: user.token })).json.data.entry.body, long);
});

test('photos: only real JPEG, PNG and WebP images, and not too big', async () => {
  const user = await newUser();
  for (const [bytes, type] of [[JPEG, 'image/jpeg'], [PNG, 'image/png'], [WEBP, 'image/webp']]) {
    const res = await upload(user.token, bytes, { type });
    assert.equal(res.status, 201, type);
    assert.match(res.json.data.photo.url, /^\/journal\/photos\/[0-9a-f-]{36}\/file\?e=\d+&s=[0-9a-f]{32}$/);
  }
  const sized = await upload(user.token, JPEG, { query: '?width=4032&height=3024' });
  assert.deepEqual([sized.json.data.photo.width, sized.json.data.photo.height], [4032, 3024]);
  assert.equal((await upload(user.token, JPEG, { query: '?width=0' })).status, 422);

  const text = await upload(user.token, Buffer.from('hello, this is not an image at all'), { type: 'image/jpeg' });
  assert.equal(text.status, 415); // the bytes decide, not the header
  assert.equal(text.json.code, 'UNSUPPORTED_PHOTO');
  assert.equal((await upload(user.token, JPEG, { type: 'text/plain' })).status, 415); // not sent as an image at all
  assert.equal((await upload(user.token, Buffer.alloc(0))).status, 415);

  const big = await upload(user.token, Buffer.concat([JPEG, Buffer.alloc(3000)]));
  assert.equal(big.status, 413);
  assert.equal(big.json.code, 'PHOTO_TOO_LARGE');
});

test('photos: a link works without a login until it expires, and cannot be forged', async () => {
  const user = await newUser();
  const p = await photo(user, PNG);
  const res = await fetch(`${api.base}${p.url}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);

  const url = new URL(`${api.base}${p.url}`);
  const e = url.searchParams.get('e');
  const sign = (id, expires) => crypto.createHmac('sha256', api.secret).update(`${id}.${expires}`).digest('hex').slice(0, 32);
  assert.equal(url.searchParams.get('s'), sign(p.id, e));

  const link = (id, expires, sig) => fetch(`${api.base}/journal/photos/${id}/file?e=${expires}&s=${sig}`);
  assert.equal((await link(p.id, e, 'f'.repeat(32))).status, 404); // wrong signature
  assert.equal((await link(p.id, Number(e) + 86400, url.searchParams.get('s'))).status, 404); // a later expiry needs a new signature
  const past = Math.floor(Date.now() / 1000) - 60;
  assert.equal((await link(p.id, past, sign(p.id, past))).status, 404); // signed correctly, but expired
  const otherPhoto = await photo(user, JPEG);
  assert.equal((await link(otherPhoto.id, e, url.searchParams.get('s'))).status, 404); // another photo's signature
  assert.equal((await link(crypto.randomUUID(), e, url.searchParams.get('s'))).status, 404);
});

test('photos go on an entry in order, and can be reordered, removed and deleted with it', async () => {
  const user = await newUser();
  const [a, b, c] = [await photo(user, JPEG), await photo(user, PNG), await photo(user, WEBP)];
  const created = await entryOf(user, { type: 'memory', photoIds: [b.id, a.id] });
  assert.deepEqual(created.photos.map((p) => p.id), [b.id, a.id]);
  assert.equal(created.photoCount, 2);

  const reordered = await call('PATCH', `/journal/${created.id}`, { token: user.token, body: { photoIds: [a.id, c.id] } });
  assert.deepEqual(reordered.json.data.entry.photos.map((p) => p.id), [a.id, c.id]);
  // b was taken off the entry: its file is gone, not just hidden
  assert.equal((await fetch(`${api.base}${b.url}`)).status, 404);
  assert.equal((await fetch(`${api.base}${a.url}`)).status, 200);

  const untouched = await call('PATCH', `/journal/${created.id}`, { token: user.token, body: { title: 'Renamed' } });
  assert.equal(untouched.json.data.entry.photoCount, 2); // no photoIds: the photos stay

  const cleared = await call('PATCH', `/journal/${created.id}`, { token: user.token, body: { photoIds: [] } });
  assert.equal(cleared.json.data.entry.photoCount, 0);
  assert.equal((await fetch(`${api.base}${c.url}`)).status, 404);

  const d = await photo(user, JPEG);
  const other = await entryOf(user, { photoIds: [d.id] });
  await call('DELETE', `/journal/${other.id}`, { token: user.token });
  assert.equal((await fetch(`${api.base}${d.url}`)).status, 404); // deleting the entry deletes its photos
});

test("a photo can only go on the uploader's own entry, once", async () => {
  const [one, two] = await friends('Aria', 'Kabir');
  const mine = await photo(one);
  const theirs = await photo(two);
  const onlyAria = await write(one, { photoIds: [theirs.id] });
  assert.equal(onlyAria.status, 422);
  assert.equal(onlyAria.json.code, 'PHOTO_NOT_FOUND');
  assert.equal((await write(one, { photoIds: [crypto.randomUUID()] })).status, 422);
  assert.equal((await write(one, { photoIds: [mine.id, mine.id] })).status, 422);

  const entry = await entryOf(one, { photoIds: [mine.id] });
  assert.equal((await write(one, { photoIds: [mine.id] })).status, 422); // already on another entry
  const kept = await call('PATCH', `/journal/${entry.id}`, { token: one.token, body: { photoIds: [mine.id] } });
  assert.equal(kept.status, 200); // naming its own photos again is fine
});

test('uploads that never reach an entry are capped', async () => {
  const user = await newUser();
  const ids = [];
  for (let i = 0; i < 30; i++) {
    const res = await upload(user.token, JPEG);
    assert.equal(res.status, 201);
    ids.push(res.json.data.photo.id);
  }
  const over = await upload(user.token, JPEG);
  assert.equal(over.status, 429);
  assert.equal(over.json.code, 'TOO_MANY_PHOTOS');

  await entryOf(user, { photoIds: [ids[0]] }); // a photo on an entry no longer counts
  assert.equal((await upload(user.token, JPEG)).status, 201);
});

test('people to share with are the ones in a group with you', async () => {
  const lone = await newUser('Lone');
  assert.deepEqual((await call('GET', '/journal/people', { token: lone.token })).json.data.people, []);

  const [aria, kabir] = await friends('Aria', 'Kabir');
  await call('PATCH', '/profile', { token: kabir.token, body: { username: 'kabir_k' } });
  const second = (await call('POST', '/groups', { token: aria.token, body: { name: 'Book Club' } })).json.data.group;
  await call('POST', '/groups/join', { token: kabir.token, body: { inviteCode: second.inviteCode } });

  const people = (await call('GET', '/journal/people', { token: aria.token })).json.data.people;
  assert.equal(people.length, 1);
  assert.equal(people[0].id, kabir.id);
  assert.equal(people[0].name, 'Kabir');
  assert.equal(people[0].username, 'kabir_k');
  assert.deepEqual(people[0].groups.map((g) => g.name).sort(), ['Book Club', 'Sunday Circle']);
  assert.equal(people[0].email, undefined); // nothing private about them leaves with the list
});

test('shares an entry with people from a group, with a message and the photos', async () => {
  const [aria, kabir] = await friends('Aria', 'Kabir');
  const stranger = await newUser('Stranger');
  const p = await photo(aria);
  const entry = await entryOf(aria, { type: 'memory', emotion: 'joy', title: 'Beach day', photoIds: [p.id] });

  assert.equal((await share(aria, entry.id, [stranger])).status, 403); // not in a group together
  assert.equal((await share(aria, entry.id, [stranger])).json.code, 'NOT_IN_SHARED_GROUP');
  assert.equal((await share(aria, entry.id, [aria])).status, 403); // not with yourself
  assert.equal((await share(aria, entry.id, [kabir, kabir])).status, 403); // not twice
  assert.equal((await call('PUT', `/journal/${entry.id}/shares`, { token: aria.token, body: { recipientIds: ['nope'] } })).status, 422);
  assert.equal((await call('PUT', `/journal/${entry.id}/shares`, { token: aria.token, body: {} })).status, 422);
  assert.deepEqual((await call('GET', '/journal', { token: kabir.token })).json.data.entries, []); // nothing leaked

  const sent = await share(aria, entry.id, [kabir], { message: 'Thought of you today…' });
  assert.equal(sent.status, 200);
  assert.deepEqual(sent.json.data.sharedWith, [{ id: kabir.id, name: 'Kabir' }]);

  const [seen] = (await call('GET', '/journal', { token: kabir.token })).json.data.entries;
  assert.equal(seen.id, entry.id);
  assert.equal(seen.isMine, false);
  assert.deepEqual(seen.owner, { id: aria.id, name: 'Aria' });
  assert.equal(seen.sharedMessage, 'Thought of you today…');
  assert.deepEqual(seen.sharedWith, []); // who else it went to is the owner's business
  assert.equal(seen.photoCount, 1);
  assert.equal((await fetch(`${api.base}${seen.photos[0].url}`)).status, 200);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: kabir.token })).json.data.entry.title, 'Beach day');

  const [mine] = (await call('GET', '/journal', { token: aria.token })).json.data.entries;
  assert.deepEqual(mine.sharedWith, [{ id: kabir.id, name: 'Kabir' }]);
  assert.equal(mine.sharedMessage, null);

  // without the photos: only the words go
  await share(aria, entry.id, [kabir], { includePhotos: false });
  const [wordsOnly] = (await call('GET', '/journal', { token: kabir.token })).json.data.entries;
  assert.deepEqual([wordsOnly.photoCount, wordsOnly.photos], [0, []]);
  assert.equal(wordsOnly.sharedMessage, null); // the message was replaced too
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: aria.token })).json.data.entry.photoCount, 1);

  // the recipient cannot change it, and searching finds what was shared with them
  assert.equal((await call('PATCH', `/journal/${entry.id}`, { token: kabir.token, body: { title: 'Mine' } })).status, 404);
  assert.equal((await call('GET', '/journal?q=beach', { token: kabir.token })).json.data.entries.length, 1);

  // an empty list stops sharing
  assert.deepEqual((await share(aria, entry.id, [])).json.data.sharedWith, []);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: kabir.token })).status, 404);
  assert.deepEqual((await call('GET', '/journal', { token: kabir.token })).json.data.entries, []);
});

test('sharing with a different list replaces the old one', async () => {
  const aria = await newUser('Aria');
  const group = (await call('POST', '/groups', { token: aria.token, body: { name: 'Crew' } })).json.data.group;
  const kabir = await newUser('Kabir');
  const mei = await newUser('Mei');
  for (const u of [kabir, mei]) await call('POST', '/groups/join', { token: u.token, body: { inviteCode: group.inviteCode } });
  const entry = await entryOf(aria);

  await share(aria, entry.id, [kabir, mei]);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: mei.token })).status, 200);
  const only = await share(aria, entry.id, [kabir]);
  assert.deepEqual(only.json.data.sharedWith, [{ id: kabir.id, name: 'Kabir' }]);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: mei.token })).status, 404);
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: kabir.token })).status, 200);
});

test('deleting a shared entry takes it away from everyone', async () => {
  const [aria, kabir] = await friends('Aria', 'Kabir');
  const entry = await entryOf(aria);
  await share(aria, entry.id, [kabir]);
  await call('PUT', `/journal/${entry.id}/love`, { token: kabir.token });
  await call('POST', `/journal/${entry.id}/replies`, { token: kabir.token, body: { body: 'Hi' } });
  await call('DELETE', `/journal/${entry.id}`, { token: aria.token });
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: kabir.token })).status, 404);
  assert.deepEqual((await call('GET', '/journal', { token: kabir.token })).json.data.entries, []);
});

test('loves: one per person, safe to repeat, and counted for everyone', async () => {
  const [aria, kabir] = await friends('Aria', 'Kabir');
  const stranger = await newUser();
  const entry = await entryOf(aria, { type: 'memory' });
  await share(aria, entry.id, [kabir]);

  const loved = await call('PUT', `/journal/${entry.id}/love`, { token: kabir.token });
  assert.deepEqual(loved.json.data.loves, { count: 1, mine: true });
  assert.deepEqual((await call('PUT', `/journal/${entry.id}/love`, { token: kabir.token })).json.data.loves, { count: 1, mine: true });
  assert.deepEqual((await call('GET', `/journal/${entry.id}`, { token: aria.token })).json.data.entry.loves, { count: 1, mine: false });
  assert.deepEqual((await call('PUT', `/journal/${entry.id}/love`, { token: aria.token })).json.data.loves, { count: 2, mine: true });
  assert.equal((await call('GET', '/journal', { token: kabir.token })).json.data.entries[0].loves.count, 2);

  assert.deepEqual((await call('DELETE', `/journal/${entry.id}/love`, { token: kabir.token })).json.data.loves, { count: 1, mine: false });
  assert.deepEqual((await call('DELETE', `/journal/${entry.id}/love`, { token: kabir.token })).json.data.loves, { count: 1, mine: false });
  assert.equal((await call('PUT', `/journal/${entry.id}/love`, { token: stranger.token })).status, 404);
});

test('replies: the owner and the people it was shared with can write them', async () => {
  const [aria, kabir] = await friends('Aria', 'Kabir');
  const stranger = await newUser();
  const entry = await entryOf(aria, { type: 'memory' });
  await share(aria, entry.id, [kabir]);

  const reply = await call('POST', `/journal/${entry.id}/replies`, { token: kabir.token, body: { body: '  Best day in ages.  ' } });
  assert.equal(reply.status, 201);
  assert.deepEqual(
    { ...reply.json.data.reply, id: undefined, createdAt: undefined },
    { id: undefined, body: 'Best day in ages.', createdAt: undefined, author: { id: kabir.id, name: 'Kabir' }, isMine: true }
  );
  await pause();
  const ours = await call('POST', `/journal/${entry.id}/replies`, { token: aria.token, body: { body: 'Same time next month?' } });

  const detail = (await call('GET', `/journal/${entry.id}`, { token: aria.token })).json.data.entry;
  assert.deepEqual(detail.replies.map((r) => [r.author.name, r.body, r.isMine]), [['Kabir', 'Best day in ages.', false], ['Aria', 'Same time next month?', true]]);
  assert.equal(detail.replyCount, 2);
  assert.equal((await call('GET', '/journal', { token: kabir.token })).json.data.entries[0].replyCount, 2);

  for (const bad of ['', '   ', 'x'.repeat(501)]) {
    assert.equal((await call('POST', `/journal/${entry.id}/replies`, { token: kabir.token, body: { body: bad } })).status, 422);
  }
  assert.equal((await call('POST', `/journal/${entry.id}/replies`, { token: stranger.token, body: { body: 'hi' } })).status, 404);

  // the author or the owner of the entry can delete a reply; nobody else
  const mei = await newUser('Mei');
  assert.equal((await call('DELETE', `/journal/${entry.id}/replies/${ours.json.data.reply.id}`, { token: kabir.token })).status, 403);
  assert.equal((await call('DELETE', `/journal/${entry.id}/replies/${ours.json.data.reply.id}`, { token: mei.token })).status, 404);
  assert.equal((await call('DELETE', `/journal/${entry.id}/replies/${reply.json.data.reply.id}`, { token: aria.token })).status, 200);
  assert.equal((await call('DELETE', `/journal/${entry.id}/replies/${ours.json.data.reply.id}`, { token: aria.token })).status, 200);
  assert.equal((await call('DELETE', `/journal/${entry.id}/replies/${ours.json.data.reply.id}`, { token: aria.token })).json.code, 'REPLY_NOT_FOUND');
  assert.equal((await call('GET', `/journal/${entry.id}`, { token: aria.token })).json.data.entry.replyCount, 0);
});
