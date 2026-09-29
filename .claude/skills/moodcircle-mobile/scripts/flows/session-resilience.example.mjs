// Example flow: a stored session must survive a bad network, a server fault and an HTML error
// page, and must end ONLY when the backend says UNAUTHORIZED. These are the two bugs the web
// app shipped (bounced to login when the network hiccuped on open; hijacked into onboarding).
//
// It seeds an account through the API, plants the session where the web build of secure storage
// keeps it (localStorage keys mc.token / mc.user, see utils/secure-storage.web.ts), then breaks
// /api underneath the running app. It assumes the app makes an authenticated request when the
// signed-in area opens (the Home feed does) and shows a retry control when that fails.
//
// To reuse it, adapt the three marker texts below to the real screens.

export const name = 'session-resilience';

const SIGNED_IN = 'APP: home'; // text that only the signed-in area shows
const SIGN_IN = 'AUTH: sign in'; // text that only the sign-in screen shows
const RETRY = 'Try again'; // the retry control shown when the first load fails
const LOADED = 'groups: 0'; // text shown once the authenticated request succeeds

export default async function sessionResilience({ page, baseUrl, shot, expect, waitForText, pageText, allow, api }) {
  // The errors below are provoked on purpose; anything else still fails the run.
  allow(/status of 401/);
  allow(/status of 503/);
  allow(/ERR_FAILED/);
  allow(/^503 /);

  const { token, user } = await api.signIn(api.uniqueEmail('resilience'));
  const username = `r${Date.now().toString(36)}`.slice(0, 20);
  await api.request('PATCH', '/profile', { name: 'Asha', username }, token);
  const stored = JSON.stringify({ ...user, name: 'Asha', username });
  const storedToken = () => page.evaluate(() => localStorage.getItem('mc.token'));

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.evaluate(([t, u]) => {
    localStorage.setItem('mc.token', t);
    localStorage.setItem('mc.user', u);
  }, [token, stored]);

  // 1. Network down on open: retry UI, session kept, never the sign-in screen.
  await page.route('**/api/**', (route) => route.abort());
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(RETRY, 'network down on open shows a retry control', 12_000);
  expect(!(await pageText()).includes(SIGN_IN), 'network down does not bounce to sign-in');
  expect((await storedToken()) === token, 'network down keeps the stored token');
  await shot('offline-retry');
  await page.unroute('**/api/**');
  await page.getByText(RETRY).click();
  await waitForText(LOADED, 'Try again recovers once the network is back');

  // 2. Server fault with an HTML body (what cPanel/Passenger serves when the app is down).
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Service Unavailable</h1>' }),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(RETRY, 'a 503 HTML page shows a retry control', 12_000);
  expect(!(await pageText()).includes(SIGN_IN), 'a 503 does not bounce to sign-in');
  expect((await storedToken()) === token, 'a 503 keeps the stored token');
  await page.unroute('**/api/**');

  // 3. The backend rejects the token: the only thing that ends the session.
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' }),
    }),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await waitForText(SIGN_IN, 'an UNAUTHORIZED answer signs out');
  expect((await storedToken()) === null, 'sign-out cleared the stored token');
  expect(!(await pageText()).includes(SIGNED_IN), 'the signed-in area is gone after sign-out');
  await shot('rejected-token');
}
