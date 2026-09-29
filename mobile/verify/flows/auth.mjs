// Sign-up, onboarding and sign-in, end to end on the web export against the real backend.
// Run from mobile/:
//   node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/auth.mjs
//
// The app never reads the one-time code the dev backend echoes; this flow reads it from the
// network response, the way a person would read it from their email.

export const name = 'auth';

const SIGN_IN = 'See how your circle is really feeling.';
const HOME = 'Home (placeholder)';

export default async function auth({ page, baseUrl, shot, expect, waitForText, pageText, allow, api }) {
  // Deliberate failures below: wrong code, wrong password.
  allow(/status of 400/);
  allow(/status of 401/);

  const email = api.uniqueEmail('flow');
  let lastCode = null;
  page.on('response', async (response) => {
    if (!response.url().endsWith('/api/auth/otp/request')) return;
    lastCode = (await response.json().catch(() => null))?.data?.otp ?? null;
  });
  const type = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const press = (name) => page.getByRole('button', { name, exact: true }).click();

  // ── sign-in screen ──
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForText(SIGN_IN, 'cold start shows the sign-in screen');
  expect((await pageText()).includes("We'll email you a one-time code"), 'code mode is the default');
  await shot('01-sign-in');

  await press('Continue');
  await waitForText('Enter a valid email address', 'an empty email is rejected on the device');

  await page.getByText('Sign in with password instead').click();
  await waitForText('Sign in with your password.', 'the toggle switches to password mode');
  expect(await page.getByLabel('Password', { exact: true }).isVisible(), 'the password field appears');
  await shot('02-sign-in-password-mode');
  await page.getByText('Use OTP instead').click();

  // ── new account: code ──
  await type('Email address', email);
  await press('Continue');
  await waitForText('Enter OTP', 'requesting a code opens the code screen');
  expect((await pageText()).includes(email), 'the code screen says where it was sent');
  expect(lastCode !== null && /^\d{6}$/.test(lastCode), 'the backend issued a six-digit code');
  await shot('03-enter-code');

  await type('Verification code, 6 digits', '000000');
  await shot('03b-code-typed');
  await press('Verify');
  await waitForText('Invalid OTP', 'a wrong code is refused with the server message');
  expect((await pageText()).includes('Enter OTP'), 'a wrong code keeps the user on the code screen');

  await type('Verification code, 6 digits', lastCode);
  await press('Verify');

  // ── onboarding: profile ──
  await waitForText('Set up your profile', 'a verified new account is gated into profile setup');
  await shot('04-profile-setup');
  await press('Continue');
  await waitForText('Enter your display name', 'a name is required');
  await type('Display name', 'Flow Tester');
  await type('Username', 'Flow_Tester!');
  expect((await page.getByLabel('Username', { exact: true }).inputValue()) === 'flow_tester', 'the username is lower-cased and cleaned as typed');
  await page.getByRole('radio', { name: 'Avatar 🦊' }).click();
  await press('Continue');

  // ── continuation: joy, then the password offer ──
  await waitForText('What makes you feel good?', 'first profile setup is followed by the joy step');
  await shot('05-joy');
  await page.getByRole('checkbox', { name: 'Dancing' }).click();
  await page.getByRole('checkbox', { name: 'Reading' }).click();
  await type('Add your own', 'Long baths');
  await press('Add');
  await waitForText('Long baths', 'a custom activity becomes a chip');
  await shot('06-joy-chosen');
  await press('Continue');

  await waitForText('Set a quick-login password', 'the quick-login password offer follows the joy step');
  await shot('07-set-password');
  await type('New password', 'secret1');
  await type('Confirm password', 'secret2');
  await press('Set Password');
  await waitForText('Passwords do not match', 'mismatched passwords are caught');
  await type('Confirm password', 'secret1');
  await press('Set Password');
  await waitForText(HOME, 'saving the password lands in the signed-in area');
  expect(!(await pageText()).includes('Set a quick-login password'), 'the sheet closed');
  await shot('08-home');

  // ── persistence: a reload keeps the session and does not repeat the prompts ──
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(HOME, 'a reload keeps the session');
  await page.waitForTimeout(900);
  const afterReload = await pageText();
  expect(!afterReload.includes('What makes you feel good?') && !afterReload.includes('Set a quick-login password'), 'prompts are not shown again after a reload');

  // ── sign out, then the login regression: a returning user signing in with a password is not hijacked ──
  await press('Sign out');
  await waitForText(SIGN_IN, 'signing out returns to the sign-in screen');
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(SIGN_IN, 'a signed-out reload stays on the sign-in screen');
  await page.getByText('Sign in with password instead').click();
  await type('Email address', email);
  await type('Password', 'wrong-password');
  await press('Sign In');
  await waitForText('Invalid email or password', 'a wrong password is refused with the server message');
  expect((await page.getByLabel('Email address', { exact: true }).inputValue()) === email, 'a wrong password does not clear the email');
  expect((await pageText()).includes(SIGN_IN), 'a wrong password keeps the user on the sign-in screen');
  await shot('09-wrong-password');

  await type('Password', 'secret1');
  await press('Sign In');
  await waitForText(HOME, 'the right password goes straight into the app');
  await page.waitForTimeout(900);
  const afterLogin = await pageText();
  expect(!afterLogin.includes('What makes you feel good?'), 'a returning login is NOT sent through the joy screen');
  expect(!afterLogin.includes('Set a quick-login password'), 'a password login does not offer a password');
}
