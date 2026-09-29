// Phase 0 check: the freshly scaffolded app boots into the signed-out group, and the auth gate
// keeps the other groups out of reach. It matches the placeholder screens in assets/src/app
// ("Sign in (placeholder)", "Profile setup (placeholder)", "Home (placeholder)").
// Delete it in Phase 1, when those placeholders are replaced by real screens.
//
// It exists because a plain "the page has text" check passes for the wrong reasons: the demo
// screen `npm run reset-project` writes to src/app/index.tsx renders text too, and it sits
// outside the gate.

export const name = 'scaffold-check';

export default async function scaffoldCheck({ page, baseUrl, shot, expect, waitForText, pageText }) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await waitForText('Sign in (placeholder)', 'a cold start with no session shows the signed-out group');
  const text = await pageText();
  expect(!text.includes('Edit src/app/index.tsx'), 'no leftover demo route outside the gate');
  expect(!text.includes('Home (placeholder)'), 'the signed-in group is not reachable at "/" while signed out');
  await shot('signed-out');

  // Route groups do not appear in URLs: (onboarding)/profile is /profile.
  await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle' });
  await waitForText('Sign in (placeholder)', 'a signed-out deep link to /profile is sent back to the signed-out group');
  expect(!(await pageText()).includes('Profile setup (placeholder)'), 'the onboarding group did not render while signed out');
}
