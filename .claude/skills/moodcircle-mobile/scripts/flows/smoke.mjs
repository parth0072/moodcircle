// Default flow for verify-web.mjs, and the template to copy for a real one.
//
// A flow receives:
//   page     Playwright page (phone viewport, touch on)
//   baseUrl  origin serving the web export; /api is proxied to the throwaway backend
//   shot     await shot('name') -> <out>/<flow>-<name>.png
//   expect   expect(condition, 'what should be true') records a check; it never throws,
//            so every check runs and the summary lists them all
//   waitForText(text, label?)  waits until the page shows `text`, records a check, never throws
//   pageText()                 the page's visible text on one line, for `expect(...includes())`
//   allow    allow(/status of 401/) tells the harness a console/network error is expected
//            in THIS flow (you provoked it). Anything else still fails the run.
//   api      request(method, path, body?, token?), signIn(email), uniqueEmail(prefix)
//            use these to SEED state (accounts, groups, moods) instead of clicking through it
//
// Keep each flow to one user journey and give it its own uniqueEmail(): flows share one
// backend, so hard-coded emails collide across runs.

export const name = 'smoke';

export default async function smoke({ page, baseUrl, shot, expect }) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  const text = ((await page.evaluate(() => document.body.innerText)) || '').trim();
  expect(text.length > 0, 'app rendered visible text');
  await shot('home');

  // Proves the same-origin proxy reaches the real backend (health is not enveloped).
  const health = await page.evaluate(() => fetch('/api/health').then((r) => r.json()));
  expect(health?.ok === true, 'GET /api/health through the proxy returns { ok: true }');
}
