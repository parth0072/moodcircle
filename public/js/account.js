// ─────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────
function renderProfile() {
  const user = state.user;
  if (!user) return;

  const av = document.getElementById('p-av');
  if (user.avatar) {
    av.textContent = user.avatar;
    av.style.background = 'var(--p-dim)';
  } else if (user.name) {
    av.textContent = user.name[0].toUpperCase();
    av.style.background = idColor(user.id || '');
  } else {
    av.textContent = user.phone ? user.phone.slice(-2) : '?';
    av.style.background = 'var(--p)';
  }

  document.getElementById('p-name').textContent  = user.name || (user.phone ? '···' + user.phone.slice(-4) : 'You');
  document.getElementById('p-phone').textContent = user.username ? '@' + user.username : (user.email || '');
  document.getElementById('p-prem').innerHTML    = user.isPremium
    ? `<div class="prem-tag">⭐ Premium</div>`
    : `<div class="free-tag">Free plan</div>`;

  if (state.activeGroup) {
    document.getElementById('mi-group-name').textContent  = state.activeGroup.name;
    document.getElementById('mi-invite-code').textContent = state.activeGroup.inviteCode;
  }

  document.getElementById('mi-pw-text').textContent = user.hasPassword
    ? 'Change Password' : 'Set Quick-Login Password';
}

function openEditProfile() {
  initProfileSetup();
  go('s-profile-setup');
}

function openEditJoy() {
  initJoySetup();
  go('s-joy-setup');
}

function showGroupInvite() {
  if (!state.activeGroup) return;
  toast(`Invite code: ${state.activeGroup.inviteCode}`);
}

