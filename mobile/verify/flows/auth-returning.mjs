// Existing accounts signing in with a code. This is the regression that hijacked logins on the
// web: an account that predates the "what makes you feel good" step (named, joyOnboarded false)
// must go straight into the app, never through profile setup or the joy screen.
// Run from mobile/:
//   node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/auth-returning.mjs

export const name = 'auth-returning';

const HOME = 'Home (placeholder)';
const SIGN_IN = 'See how your circle is really feeling.';

export default async function authReturning({ page, baseUrl, shot, expect, waitForText, pageText, api }) {
  // Seeded through the API, the way an account created before the joy step exists.
  const legacy = api.uniqueEmail('legacy'); // named, joy never answered, no password
  const legacyAuth = await api.signIn(legacy);
  await api.request('PATCH', '/profile', { name: 'Legacy User', username: `legacy_${Date.now().toString(36)}`.slice(0, 20) }, legacyAuth.token);

  const settled = api.uniqueEmail('settled'); // named, joy answered, password set
  const settledAuth = await api.signIn(settled);
  await api.request('PATCH', '/profile', { name: 'Settled User', joyActivities: ['Reading'] }, settledAuth.token);
  await api.request('POST', '/auth/password/set', { password: 'secret1' }, settledAuth.token);

  let lastCode = null;
  page.on('response', async (response) => {
    if (!response.url().endsWith('/api/auth/otp/request')) return;
    lastCode = (await response.json().catch(() => null))?.data?.otp ?? null;
  });
  const type = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const press = (name) => page.getByRole('button', { name, exact: true }).click();
  const signInWithCode = async (email) => {
    await type('Email address', email);
    await press('Continue');
    await waitForText('Enter OTP', `a code was requested for ${email.split('.')[0]}`);
    await type('Verification code, 6 digits', lastCode);
    await press('Verify');
  };

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForText(SIGN_IN, 'the app starts signed out');

  // ── the hijack case ──
  await signInWithCode(legacy);
  await waitForText(HOME, 'a named account with no joy answer goes straight into the app');
  let text = await pageText();
  expect(!text.includes('Set up your profile'), 'it is not sent through profile setup');
  // Only the password offer follows, because this account has no password yet.
  await waitForText('Set a quick-login password', 'the password offer appears for an account without a password');
  // The joy prompt (if the bug returned) would arrive at the same moment as the password offer.
  expect(!(await pageText()).includes('What makes you feel good?'), 'the joy screen is NOT shown at login');
  await shot('01-legacy-password-offer');
  await press('Skip for now');
  await waitForText(HOME, 'skipping the offer returns to the app');
  await press('Sign out');
  await waitForText(SIGN_IN, 'sign out works');

  // ── a settled account: nothing at all interrupts it ──
  await signInWithCode(settled);
  await waitForText(HOME, 'a settled account goes straight into the app');
  await page.waitForTimeout(1200);
  text = await pageText();
  expect(!text.includes('Set a quick-login password'), 'no password offer (it already has one)');
  expect(!text.includes('What makes you feel good?'), 'no joy screen');
  expect(text.includes('Settled User'), 'the stored profile is shown');
  await shot('02-settled-home');
}
