// ─────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────
let curScreen = null;

function go(id) {
  const prev = curScreen ? document.getElementById(curScreen) : null;
  const next = document.getElementById(id);
  if (!next || id === curScreen) return;
  if (prev) prev.classList.remove('active');
  next.classList.add('active');
  curScreen = id;
}

function navTo(id) {
  go(id);
  if (id === 's-hist')    loadHistory(state.histDays);
  if (id === 's-streak')  loadStreak();
  if (id === 's-profile') renderProfile();
  if (id === 's-feed')    loadFeed();
}

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────
async function boot() {
  // Always start from a blank slate — no screen should be active yet
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  curScreen = null;

  if (!state.token) { go('s-auth'); return; }

  // First-time users need to set up their profile
  if (!state.user?.name) { go('s-profile-setup'); initProfileSetup(); return; }

  await continueAfterProfile();
}

