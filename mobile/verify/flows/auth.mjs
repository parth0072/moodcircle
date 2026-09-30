// The account journey, end to end on the web export against the real backend: intro, sign up
// with an emailed code, sign out, log in (wrong password, remember me off), forgot password.
// Run from mobile/:
//   node ../.claude/skills/moodcircle-mobile/scripts/verify-web.mjs --project . --flow verify/flows/auth.mjs
//
// The app never reads the one-time code the dev backend echoes; this flow reads it from the
// network response, the way a person would read it from their email.

export const name = 'auth';

const INTRO = 'Notice how you feel, one day at a time';
const WELCOME = 'A kinder place for your feelings';
const HOME = 'How did today feel?'; // the Home screen's prompt while nothing is logged today

export default async function auth({ page, baseUrl, shot, expect, waitForText, pageText, allow }) {
  // Deliberate failures below: wrong code, wrong password.
  allow(/status of 400/);
  allow(/status of 401/);

  const email = `flow-${Date.now().toString(36)}@example.com`;
  const password = 'Secret123!';
  let lastCode = null;
  page.on('response', async (response) => {
    if (!response.url().endsWith('/api/auth/otp/request')) return;
    lastCode = (await response.json().catch(() => null))?.data?.otp ?? null;
  });
  const type = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const press = (label) => page.getByRole('button', { name: label, exact: true }).click();
  const text = async (needle) => (await pageText()).includes(needle);

  // ── intro, shown once ──
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForText(INTRO, 'cold start shows the intro');
  await shot('01-intro');
  await press('Get started');
  await waitForText(WELCOME, 'Get started opens the welcome screen');
  await shot('02-welcome');
  expect(!(await text('Continue with Apple')), 'no Apple or Google buttons: the server has neither');
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(WELCOME, 'the intro is not shown again after a relaunch');

  // ── sign up ──
  await press('Create an account');
  await waitForText('Create your account', 'Create an account opens the sign-up form');
  await press('Create account');
  await waitForText('Enter your name', 'an empty form is refused on the device');
  expect(await text('Agree to the Terms and Privacy Policy to continue'), 'the terms must be agreed');
  await shot('03-sign-up-errors');

  await type('Your name', 'Flow Tester');
  await type('Email', email);
  await type('Password', 'abcdEF12');
  await waitForText('Good — add a symbol to make it strong', 'the password meter reads what is typed');
  await type('Password', password);
  await page.getByRole('button', { name: 'Show password' }).click();
  expect((await page.getByLabel('Password', { exact: true }).getAttribute('type')) !== 'password', 'Show reveals the password');
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).click();
  await shot('04-sign-up-filled');
  await press('Create account');

  await waitForText('Check your email', 'a valid form emails a code and opens the code screen');
  expect(lastCode !== null && /^\d{6}$/.test(lastCode), 'the backend issued a six-digit code');
  expect(await text(email), 'the code screen says where it was sent');
  await shot('05-verify');
  await type('Verification code, 6 digits', '000000');
  await press('Verify');
  await waitForText('Invalid OTP', 'a wrong code is refused with the server message');
  await type('Verification code, 6 digits', lastCode);
  await press('Verify');

  await waitForText(HOME, 'a verified code creates the account and signs in');
  expect(!(await text('What should we call you?')), 'the name typed on the form was saved: no name screen');
  await shot('06-home');

  // ── the session survives a relaunch ──
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(HOME, 'a reload keeps the session');

  // ── sign out, then log in ──
  await page.getByText('Sign out').click();
  await waitForText(WELCOME, 'signing out returns to the welcome screen (not the intro)');
  await press('Log in');
  await waitForText('Welcome back', 'Log in opens the log-in form');
  await press('Log in');
  await waitForText('Enter your password', 'an empty log-in form is refused on the device');
  await type('Email', email);
  await type('Password', 'wrong-password');
  await press('Log in');
  await waitForText('Invalid', 'a wrong password is refused with the server message');
  expect((await page.getByLabel('Email', { exact: true }).inputValue()) === email, 'a wrong password does not clear the email');
  expect((await page.getByLabel('Password', { exact: true }).inputValue()) === 'wrong-password', 'a wrong password does not clear the password');
  expect(await text('Welcome back'), 'a wrong password keeps the user on the log-in screen');
  await shot('07-log-in-wrong-password');

  await type('Password', password);
  await page.getByRole('checkbox', { name: 'Remember me' }).click(); // off
  await press('Log in');
  await waitForText(HOME, 'the right password logs in');

  // ── "Remember me" off: a relaunch starts signed out ──
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(WELCOME, 'without Remember me a relaunch starts signed out');

  // ── forgot password: a code instead, then a chance to choose a new password ──
  await press('Log in');
  await waitForText('Welcome back');
  await press('Forgot password?');
  await waitForText('Enter your email first', 'Forgot password needs the email first');
  await type('Email', email);
  await press('Forgot password?');
  await waitForText('Check your email', 'Forgot password emails a code');
  await type('Verification code, 6 digits', lastCode);
  await press('Verify');
  await waitForText(HOME, 'the code logs in');
  await waitForText('Choose a password', 'the password sheet is offered after a forgot-password login');
  await shot('08-choose-password');
  await press('Not now');
  await waitForText(HOME, 'Not now closes the sheet');
}
