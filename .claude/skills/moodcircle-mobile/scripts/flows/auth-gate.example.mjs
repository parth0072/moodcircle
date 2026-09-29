// Example flow: the three-state auth gate (signedOut -> needsProfile -> ready), persistence
// across a reload, and sign-out. It was proven against a throwaway skeleton whose screens
// showed "AUTH: sign in", "ONBOARDING: profile" and "APP: home" and had buttons labelled
// "DO sign in", "DO save profile", "DO sign out".
//
// To reuse it, copy it next to the app (mobile/verify/flows/auth.mjs) and change the marker
// texts and the click/fill steps to the real screens. Keep the assertions: each one guards a
// bug the web app actually had (login hijack, logout on open, profile response dropping email).

export const name = 'auth-gate';

export default async function authGate({ page, baseUrl, shot, expect, waitForText, pageText }) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForText('AUTH: sign in', 'cold start with no session lands in (auth)');

  // Groups are invisible in URLs: (onboarding)/profile is /profile. A signed-out user must not reach it.
  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle' });
  await waitForText('AUTH: sign in', 'a protected deep link is redirected to (auth) when signed out');

  await page.getByText('DO sign in').click(); // real app: fill email, request code, fill code
  await waitForText('ONBOARDING: profile', 'a new account (no display name) is gated into (onboarding)');

  await page.getByText('DO save profile').click();
  await waitForText('APP: home', 'saving the profile flips the gate to (app) with no manual navigation');
  expect((await pageText()).includes('hello Asha (gate.'), 'profile response was merged: name updated, email kept');
  await shot('home');

  await page.reload({ waitUntil: 'networkidle' });
  await waitForText('APP: home', 'a reload with a stored session goes straight to (app)');

  await page.getByText('DO sign out').click();
  await waitForText('AUTH: sign in', 'signing out returns to (auth)');
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText('AUTH: sign in', 'a signed-out reload stays in (auth)');
}
