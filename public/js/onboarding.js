// ─────────────────────────────────────────────
// Profile Setup
// ─────────────────────────────────────────────
const AVATARS = ['😊','😄','😎','🤗','🥳','😴','🤔','😇','🤩','😜','🥸','🧐','👻','🦊','🐼','🌟','🎯','🚀'];
let chosenAvatar = AVATARS[0];

function initProfileSetup() {
  chosenAvatar = state.user?.avatar || AVATARS[0];
  document.getElementById('ps-av-preview').textContent = chosenAvatar;
  document.getElementById('ps-name').value = state.user?.name || '';
  document.getElementById('ps-username').value = state.user?.username || '';

  const grid = document.getElementById('ps-av-grid');
  grid.innerHTML = AVATARS.map(e =>
    `<div class="ps-av-opt${e === chosenAvatar ? ' sel' : ''}" onclick="pickAvatar('${e}',this)">${e}</div>`
  ).join('');
}

function pickAvatar(emoji, el) {
  chosenAvatar = emoji;
  document.getElementById('ps-av-preview').textContent = emoji;
  document.querySelectorAll('.ps-av-opt').forEach(d => d.classList.remove('sel'));
  el.classList.add('sel');
}

async function doSaveProfile() {
  const name     = document.getElementById('ps-name').value.trim();
  const username = document.getElementById('ps-username').value.trim();
  if (!name)     { toast('Enter your display name', 'err'); return; }
  if (username && username.length < 3) { toast('Username must be at least 3 characters', 'err'); return; }

  setLoading('ps-btn', true);
  try {
    const { user } = await api('PATCH', '/profile', { name, username: username || undefined, avatar: chosenAvatar });
    state.user = { ...state.user, ...user };
    localStorage.setItem('mc_user', JSON.stringify(state.user));
    await afterProfileSetupExit();
  } catch(e) {
    toast(e.message || 'Failed to save profile', 'err');
  } finally {
    setLoading('ps-btn', false);
  }
}

async function skipProfile() {
  await afterProfileSetupExit();
}

// Only reachable right after the profile-setup screen itself (a fresh
// signup, or an explicit "Edit Profile") — never from a plain login, so
// an existing account's sign-in is never interrupted by this.
async function afterProfileSetupExit() {
  // "Things that make you feel good" — asked once. accounts that
  // predate this feature pick it up next time they touch their profile,
  // not by having their next login hijacked.
  if (!state.user?.joyOnboarded) { go('s-joy-setup'); initJoySetup(); return; }
  await continueAfterProfile();
}

async function continueAfterProfile() {
  go('s-loading');
  document.getElementById('loading-spinner-wrap').style.display = 'flex';
  document.getElementById('loading-error').style.display = 'none';
  try {
    const { groups } = await api('GET', '/groups');
    state.allGroups = groups;
    if (!groups.length) { go('s-setup'); updateSetupScreen(); return; }
    const g = groups.find(g => g.id === state.activeGroupId) || groups[0];
    state.activeGroup   = g;
    state.activeGroupId = g.id;
    localStorage.setItem('mc_group_id', g.id);
    await loadFeed();
    go('s-feed');
  } catch(e) {
    // api() already handled a real 401 itself (logout() clears state.token
    // and navigates to auth). Anything else here — a network blip, a slow
    // cold-start on shared hosting, a bad response — is NOT an auth
    // failure, so don't sign the user out or bounce them to login; their
    // token is still good, just offer a retry.
    if (!state.token) { if (curScreen !== 's-auth') go('s-auth'); return; }
    document.getElementById('loading-spinner-wrap').style.display = 'none';
    document.getElementById('loading-error').style.display = 'flex';
  }
}

// ─────────────────────────────────────────────
// Joy Setup — "things that make you feel good"
// ─────────────────────────────────────────────
const JOY_SUGGESTIONS = [
  'Listening to music', 'Going for a walk', 'Calling a friend', 'Dancing',
  'Journaling', 'Cooking something', 'Reading', 'Napping', 'Playing a game',
  'Exercising', 'Meditating', 'Watching a comfort show',
];
let chosenJoyActivities = [];

function initJoySetup() {
  chosenJoyActivities = Array.isArray(state.user?.joyActivities) ? [...state.user.joyActivities] : [];
  document.getElementById('joy-custom-input').value = '';
  renderJoyChips();
  renderJoyAdded();
}

function renderJoyChips() {
  document.getElementById('joy-chip-grid').innerHTML = JOY_SUGGESTIONS.map((s, i) => {
    const on = chosenJoyActivities.includes(s);
    return `<div class="chip${on ? ' sel' : ''}" onclick="toggleJoyChip(${i})">${on ? '✓ ' : ''}${escHtml(s)}</div>`;
  }).join('');
}

function renderJoyAdded() {
  const customs = chosenJoyActivities.filter(a => !JOY_SUGGESTIONS.includes(a));
  document.getElementById('joy-added-list').innerHTML = customs.map((a, i) =>
    `<div class="chip-added">${escHtml(a)} <span onclick="removeCustomJoyAt(${i})">✕</span></div>`
  ).join('');
}

function toggleJoyChip(idx) {
  const text = JOY_SUGGESTIONS[idx];
  const i = chosenJoyActivities.indexOf(text);
  if (i >= 0) {
    chosenJoyActivities.splice(i, 1);
  } else {
    if (chosenJoyActivities.length >= 12) { toast('You can add up to 12', 'err'); return; }
    chosenJoyActivities.push(text);
  }
  renderJoyChips();
  renderJoyAdded();
}

function addCustomJoy() {
  const input = document.getElementById('joy-custom-input');
  const val = input.value.trim();
  if (!val) return;
  if (chosenJoyActivities.length >= 12) { toast('You can add up to 12', 'err'); return; }
  if (!chosenJoyActivities.includes(val)) chosenJoyActivities.push(val);
  input.value = '';
  renderJoyChips();
  renderJoyAdded();
}

function removeCustomJoyAt(customIdx) {
  const customs = chosenJoyActivities.filter(a => !JOY_SUGGESTIONS.includes(a));
  const val = customs[customIdx];
  chosenJoyActivities = chosenJoyActivities.filter(a => a !== val);
  renderJoyChips();
  renderJoyAdded();
}

async function doSaveJoyActivities() {
  setLoading('joy-btn', true);
  try {
    const { user } = await api('PATCH', '/profile', { joyActivities: chosenJoyActivities });
    state.user = { ...state.user, ...user };
    localStorage.setItem('mc_user', JSON.stringify(state.user));
    await continueAfterProfile();
  } catch(e) {
    toast(e.message || 'Could not save', 'err');
  } finally {
    setLoading('joy-btn', false);
  }
}

