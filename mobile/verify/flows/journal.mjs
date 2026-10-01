// The journal screens, end to end on the web export against the real backend: the list with its
// filter and search, a memory with photos, love and a reply, a note a friend shared, writing a new
// note with a photo and sending it to a friend, changing it, and deleting it.
// Run from mobile/:
//   node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/journal.mjs
//
// A second person ("Kabir") is made through the API, in a group with the person under test, so there is
// someone to share with and to share back. Photos are small generated PNGs (scripts/lib/png.mjs).

import { photos } from '../../../.claude/skills/moodcircle-mobile/scripts/lib/png.mjs';

export const name = 'journal';

const HOME = 'How did today feel?';
const INTRO = 'Notes for hard days, memories for good ones.';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function journal({ page, baseUrl, shot, expect, waitForText, pageText, api }) {
  const email = `journal-${Date.now().toString(36)}@example.com`;
  let lastCode = null;
  page.on('response', async (response) => {
    if (!response.url().endsWith('/api/auth/otp/request')) return;
    lastCode = (await response.json().catch(() => null))?.data?.otp ?? null;
  });
  const type = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const press = (label) => page.getByRole('button', { name: label, exact: true }).click();
  const card = (title) => page.getByRole('button', { name: new RegExp(`^${title}\\.`) });
  const text = async (needle) => (await pageText()).includes(needle);

  // ── Kabir, in a group with the person under test, with a note he shares with them ──
  const kabir = await api.signIn(api.uniqueEmail('kabir'));
  await api.request('PATCH', '/profile', { name: 'Kabir' }, kabir.token);
  const circle = (await api.request('POST', '/groups', { name: 'Sunday Circle' }, kabir.token))
    .group;

  // ── sign up as the person under test ──
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await press('Get started');
  await press('Create an account');
  await type('Your name', 'Aria');
  await type('Email', email);
  await type('Password', 'Secret123!');
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).click();
  await press('Create account');
  await waitForText('Check your email');
  await type('Verification code, 6 digits', lastCode);
  await press('Verify');
  await waitForText(HOME, 'signed up and on Home');
  await shot('00-home-journal-button');
  expect(
    await page.getByRole('button', { name: 'Journal', exact: true }).isVisible(),
    'Home has a Journal button',
  );

  // ── seed through the API: Kabir's note first (the oldest), then Aria's three entries ──
  const aria = await api.signIn(email);
  await api.request(
    'POST',
    '/groups/join',
    { inviteCode: circle.inviteCode, autoShare: false },
    aria.token,
  );
  const upload = async (png) =>
    (await api.upload('/journal/photos?width=120&height=90', png, 'image/png', aria.token)).photo
      .id;
  const write = async (token, entry) => (await api.request('POST', '/journal', entry, token)).entry;

  const hard = await write(kabir.token, {
    type: 'note',
    emotion: 'worry',
    title: 'A hard week',
    body: 'Work has been a lot and I have not slept much.',
  });
  await api.request(
    'PUT',
    `/journal/${hard.id}/shares`,
    { recipientIds: [aria.user.id], message: 'Thought of you.' },
    kabir.token,
  );
  await pause(20);
  await write(aria.token, {
    type: 'memory',
    emotion: 'calm',
    title: 'First hike of autumn',
    body: 'Cold hands, warm tea at the top.',
    photoIds: [await upload(photos.hills)],
  });
  await pause(20);
  await write(aria.token, {
    type: 'note',
    emotion: 'sad',
    title: 'Couldn’t sleep again',
    body: 'Kept replaying the meeting. I think I’m more tired than upset. Tomorrow I’ll rest.',
  });
  await pause(20);
  const beach = await write(aria.token, {
    type: 'memory',
    emotion: 'joy',
    title: 'Beach day with Kabir',
    body: 'We stayed until the sun went down and talked about everything. I want to remember how light I felt today.',
    photoIds: [
      await upload(photos.sunset),
      await upload(photos.iceCream),
      await upload(photos.sand),
    ],
  });
  await api.request(
    'PUT',
    `/journal/${beach.id}/shares`,
    { recipientIds: [kabir.user.id] },
    aria.token,
  );
  await api.request('PUT', `/journal/${beach.id}/love`, undefined, kabir.token);
  await api.request(
    'POST',
    `/journal/${beach.id}/replies`,
    { body: 'Best day in ages. Same time next month?' },
    kabir.token,
  );

  // ── the list ──
  await press('Journal');
  await waitForText(INTRO, 'the Journal button opens the list');
  await waitForText('Beach day with Kabir', 'the newest entry is first');
  await pause(600); // let the photos fade in before the picture is taken
  expect(await text('Shared with Kabir'), 'the shared memory says who it went to');
  expect(await text('From Kabir'), 'a note a friend shared is marked');
  expect(await text('Memory · '), 'a memory shows its type and day');
  expect(await text('3 photos'), 'and how many photos');
  await shot('01-list');

  // ── filter and search ──
  const gone = (title) =>
    page
      .getByText(title)
      .first()
      .waitFor({ state: 'hidden', timeout: 8000 })
      .then(
        () => true,
        () => false,
      );
  await page.getByRole('radio', { name: 'Notes', exact: true }).click();
  expect(await gone('Beach day with Kabir'), 'the Notes filter drops memories');
  await waitForText('A hard week', 'and keeps notes');
  await pause(300);
  await shot('02-list-notes');
  await page.getByRole('radio', { name: 'Memories', exact: true }).click();
  expect(await gone('Couldn’t sleep again'), 'the Memories filter drops notes');
  await waitForText('First hike of autumn', 'and keeps memories');
  await page.getByRole('radio', { name: 'All', exact: true }).click();
  await waitForText('Couldn’t sleep again', 'All brings everything back');
  await press('Search entries');
  await type('Search your journal', 'tired');
  expect(await gone('Beach day with Kabir'), 'a search leaves out what does not match');
  await waitForText('Couldn’t sleep again', 'and finds words in the text');
  await pause(300);
  await shot('03-search');
  await type('Search your journal', 'zebra');
  await waitForText('No entry matches', 'a search with no result says so');
  await press('Close search');
  await waitForText('Beach day with Kabir', 'closing the search brings the list back');

  // ── a memory with photos: love, a reply ──
  await card('Beach day with Kabir').click();
  await waitForText('We stayed until the sun went down', 'the memory opens');
  await waitForText('Best day in ages. Same time next month?', 'Kabir’s reply shows');
  expect(await text('Love · 1'), 'Kabir’s love is counted');
  expect(await text('Shared with Kabir'), 'the bar says who it is shared with');
  await pause(600);
  await shot('04-memory');
  await page.getByRole('button', { name: 'Show photo 2' }).click();
  await pause(600);
  await shot('05-memory-photo-2');
  await page.getByRole('button', { name: 'Love · 1' }).click();
  await waitForText('Loved · 2', 'a love is added and counted');
  await press('Reply');
  await type('Your reply', 'Yes! Booking it now.');
  await press('Send reply');
  await waitForText('Yes! Booking it now.', 'the reply is on the page');
  expect(await text('You'), 'the person’s own reply says "You"');
  await shot('06-memory-replied');

  // ── a note a friend shared ──
  await press('Back');
  await waitForText(INTRO);
  await card('A hard week').click();
  await waitForText('Work has been a lot', 'the shared note opens');
  expect(await text('Thought of you.'), 'his message is shown');
  expect(await text('From Kabir'), 'the bar says who sent it');
  expect(
    !(await page
      .getByRole('button', { name: 'Edit entry' })
      .isVisible()
      .catch(() => false)),
    'it cannot be changed by the person it was shared with',
  );
  await shot('07-shared-note');
  await press('Back');

  // ── write a new note with a photo, and tell a friend ──
  await press('Write it down');
  await waitForText(
    'Pick a mood and add a title to save.',
    'the write screen opens, nothing to save yet',
  );
  await page.getByRole('radio', { name: 'Sad', exact: true }).click();
  await waitForText('Heavy day?', 'a sad mood offers to tell a friend');
  await type('Title', 'Missing last summer');
  await type('Entry', 'Feeling heavy tonight. I miss how easy things felt last summer.');
  await press('What happened?');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), press('Add photo')]);
  await chooser.setFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: photos.sunset });
  await page.getByRole('button', { name: 'Remove photo' }).waitFor();
  await page.getByRole('button', { name: 'Save note' }).waitFor();
  for (
    let i = 0;
    i < 40 && (await page.getByRole('button', { name: 'Save note' }).isDisabled());
    i++
  )
    await pause(250);
  expect(
    !(await page.getByRole('button', { name: 'Save note' }).isDisabled()),
    'the photo uploaded and the note can be saved',
  );
  await pause(400);
  await shot('08-write');
  await press('Tell a friend');
  await press('Next: choose friends');
  await waitForText('Share with a friend', 'saving goes on to choose friends');
  await waitForText('In Sunday Circle', 'the people come from the groups');
  expect(await text('Kabir'), 'Kabir can be chosen');
  expect(await text('Include photos'), 'the photo can be left out');
  await pause(400);
  await page.getByRole('checkbox', { name: /^Kabir/ }).click();
  await type('Add a message', 'Rough night. Thought you should know.');
  await shot('09-share');
  await press('Send to 1 friend');
  await waitForText('Missing last summer', 'sharing ends on the new entry');
  await waitForText('Shared with Kabir', 'which is now shared');
  await pause(600);
  await shot('10-entry-shared');

  // ── Kabir sees it and answers ──
  const seen = (await api.request('GET', '/journal', undefined, kabir.token)).entries.find(
    (e) => e.title === 'Missing last summer',
  );
  expect(
    seen && seen.photoCount === 1 && seen.sharedMessage === 'Rough night. Thought you should know.',
    'Kabir received it with its photo and message',
  );
  await api.request(
    'POST',
    `/journal/${seen.id}/replies`,
    { body: 'Call you tomorrow?' },
    kabir.token,
  );
  await press('Back');
  await waitForText(INTRO);
  await card('Missing last summer').click();
  await waitForText('Call you tomorrow?', 'his answer shows when the entry is opened again');

  // ── change it, then delete it ──
  await press('Edit entry');
  await waitForText('Save changes', 'editing opens the same screen, filled in');
  await type('Title', 'Missing last summer, a bit less');
  await press('Save changes');
  await waitForText('Missing last summer, a bit less', 'the change is on the entry');
  await press('Edit entry');
  await waitForText('Delete entry');
  await press('Delete entry');
  await waitForText('Delete this entry?', 'deleting asks first');
  await shot('11-delete-confirm');
  await press('Delete');
  await waitForText(INTRO, 'a deleted entry lands back on the list');
  await waitForText('Beach day with Kabir');
  expect(!(await text('Missing last summer')), 'and is gone from it');
  await shot('12-list-after');
}
