// The group screens, end to end on the web export against the real backend: an empty circles list,
// starting a group, sharing a mood to it, a hug, and joining another person's group by its code.
// Run from mobile/:
//   node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/groups.mjs
//
// A second person ("Kabir") is made through the API, so there is someone to hug and a group to join.

export const name = 'groups';

const HOME = 'How did today feel?';

export default async function groups({ page, baseUrl, shot, expect, waitForText, pageText, allow, api }) {
  // Deliberate failure below: a code no group has is looked up.
  allow(/status of 404/);

  const email = `groups-${Date.now().toString(36)}@example.com`;
  let lastCode = null;
  page.on('response', async (response) => {
    if (!response.url().endsWith('/api/auth/otp/request')) return;
    lastCode = (await response.json().catch(() => null))?.data?.otp ?? null;
  });
  const type = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const press = (label) => page.getByRole('button', { name: label, exact: true }).click();
  const text = async (needle) => (await pageText()).includes(needle);

  // ── Kabir, with a "mood only" group of his own that the person under test will join ──
  const kabir = await api.signIn(api.uniqueEmail('kabir'));
  await api.request('PATCH', '/profile', { name: 'Kabir' }, kabir.token);
  const bookClub = (
    await api.request('POST', '/groups', { name: 'Book Club', color: 'pink', showNotes: false }, kabir.token)
  ).group;
  await api.request('POST', `/groups/${bookClub.id}/moods`, { emotion: 'calm', note: 'Quiet morning' }, kabir.token);

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
  await shot('00-home-groups-button');

  // ── circles: none yet ──
  await press('Groups');
  await waitForText('Your circles', 'the Groups button opens the circles list');
  await waitForText('No circles yet', 'a new account has no circles');
  await shot('01-circles-empty');

  // ── start a group ──
  await press('Create a group');
  await waitForText('Start a group');
  await press('Create & share invite');
  await waitForText('Give your group a name', 'a group needs a name');
  await type('Group name', 'Sunday Circle');
  await shot('02-create');
  await page.getByRole('radio', { name: /^Mood \+ notes/ }).click(); // so the words show on this feed
  await press('Create & share invite'); // there is no share sheet in a browser: the group's feed opens
  await waitForText('RIGHT NOW', 'the new group opens on its feed'); // the label is drawn in capitals
  await waitForText('Nobody has shared yet today');
  expect(await text('1 member · code'), 'the feed shows the invite code');
  await shot('03-feed-empty');

  // ── share a mood to it ──
  await press('Share how you feel');
  await waitForText('How are you, right now?', 'the share screen opens');
  expect(await text('Post Calm to 1 group'), 'the group it came from is ticked, on the design\'s Calm');
  await page.getByRole('radio', { name: 'Joy', exact: true }).click();
  await type('Add a few words', 'Finally shipped the thing!');
  await shot('04-share');
  await press('Post Joy to 1 group');
  await waitForText('Finally shipped the thing!', 'the post is on the feed');
  expect(await text('Mostly joy'), 'the feed headlines the mood');

  // ── someone else joins and posts; a hug ──
  const code = /code ([A-Z0-9]{6})/.exec(await pageText())?.[1];
  expect(Boolean(code), 'the invite code can be read off the feed');
  await api.request('POST', '/groups/join', { inviteCode: code, autoShare: false }, kabir.token);
  const mine = (await api.request('GET', '/groups', undefined, kabir.token)).groups.find((g) => g.name === 'Sunday Circle');
  await api.request('POST', `/groups/${mine.id}/moods`, { emotion: 'sad', note: 'Long day, missing home a bit.' }, kabir.token);
  // Going back to the list and opening the group again shows what Kabir posted.
  await press('Back');
  await waitForText('Your circles');
  await page.getByRole('button', { name: /^Sunday Circle\./ }).click();
  await waitForText('Long day, missing home a bit.', 'the other person\'s post shows when the group is opened again');
  await page.getByRole('button', { name: 'Send a hug · 0' }).first().click(); // the newest post is Kabir's
  await waitForText('Send a hug · 1', 'a hug is counted');
  await shot('05-feed-two-posts');

  // ── the circles list, now with a group ──
  await press('Back');
  await waitForText('Your circles', 'back on the circles list');
  await waitForText('2 members · 2 posts today', 'the card counts members and posts, refreshed on return');
  await shot('06-circles');

  // ── join Kabir's group by its code ──
  await press('Join with code');
  await waitForText('Join a group');
  await type('Invite code', 'ZZZZZZ');
  await waitForText('No group has this code.', 'a wrong code is said to be wrong');
  await shot('07-join-wrong-code');
  await type('Invite code', bookClub.inviteCode.toLowerCase());
  await waitForText('Group found', 'a right code finds the group');
  expect(await text('Created by Kabir'), 'the creator is named');
  expect(await text('not their notes'), 'a mood-only group says notes are not shown');
  await shot('08-join-found');
  await press('Join Book Club');
  await waitForText('RIGHT NOW', 'joining opens the group');
  expect(await text('Kabir'), 'Kabir is listed');
  expect(!(await text('Quiet morning')), 'a mood-only group hides his words');
  await shot('09-joined-mood-only');
}
