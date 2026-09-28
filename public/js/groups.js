// ─────────────────────────────────────────────
// Groups — switcher sheet
// ─────────────────────────────────────────────
function openGroupSwitcher() {
  if (!state.allGroups || state.allGroups.length <= 1) return;
  const list = document.getElementById('switcher-list');
  list.innerHTML = state.allGroups.map(g => `
    <div class="group-row${g.id === state.activeGroupId ? ' sel' : ''}" onclick="switchGroup('${g.id}')">
      <div class="group-row-icon">🫂</div>
      <div style="flex:1">
        <div class="group-row-name">${escHtml(g.name)}</div>
        <div class="group-row-code">#${g.inviteCode}</div>
      </div>
      ${g.id === state.activeGroupId ? '<span class="group-row-check">✓</span>' : ''}
    </div>
  `).join('');
  document.getElementById('group-switcher').style.display = 'flex';
}

function closeGroupSwitcher() {
  document.getElementById('group-switcher').style.display = 'none';
}

async function switchGroup(id) {
  closeGroupSwitcher();
  if (id === state.activeGroupId) { go('s-feed'); return; }
  const g = state.allGroups.find(g => g.id === id);
  if (!g) { toast('Group not found', 'err'); return; }
  state.activeGroup   = g;
  state.activeGroupId = g.id;
  localStorage.setItem('mc_group_id', g.id);
  go('s-feed');
  try {
    await loadFeed();
  } catch(e) {
    toast(e.message || 'Could not load group', 'err');
  }
}

function goSetup() {
  updateSetupScreen();
  go('s-setup');
}

function updateSetupScreen() {
  const hasGroups = state.allGroups && state.allGroups.length > 0;
  document.getElementById('setup-back-btn').style.display  = hasGroups ? '' : 'none';
  document.getElementById('setup-title').textContent       = hasGroups ? 'Add a group' : 'MoodCircle';
  document.getElementById('setup-hero-emoji').textContent  = hasGroups ? '➕' : '🫂';
  document.getElementById('setup-hero-title').textContent  = hasGroups ? 'Add another group' : "You're not in any groups yet";
  document.getElementById('setup-hero-sub').textContent    = hasGroups
    ? 'Create a new group or join one with an invite code.'
    : 'Create a group for your friends, or join one with an invite code.';
}

// ─────────────────────────────────────────────
// Groups — setup screen
// ─────────────────────────────────────────────
async function doCreateGroup() {
  const name = document.getElementById('create-name').value.trim();
  if (!name) { toast('Enter a group name', 'err'); return; }
  setLoading('create-btn', true);
  try {
    const data = await api('POST', '/groups', { name });
    state.activeGroup   = data.group;
    state.activeGroupId = data.group.id;
    localStorage.setItem('mc_group_id', data.group.id);
    if (!state.allGroups.find(g => g.id === data.group.id)) state.allGroups.push(data.group);
    document.getElementById('create-name').value = '';
    toast(`"${data.group.name}" created! Invite code: ${data.group.inviteCode}`);
    await loadFeed();
    go('s-feed');
  } catch(e) {
    toast(e.message || 'Could not create group', 'err');
  } finally {
    setLoading('create-btn', false);
  }
}

async function doJoinGroup() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (code.length < 6) { toast('Enter the 6-character invite code', 'err'); return; }
  setLoading('join-btn', true);
  try {
    const data = await api('POST', '/groups/join', { inviteCode: code });
    state.activeGroup   = data.group;
    state.activeGroupId = data.group.id;
    localStorage.setItem('mc_group_id', data.group.id);
    if (!state.allGroups.find(g => g.id === data.group.id)) state.allGroups.push(data.group);
    document.getElementById('join-code').value = '';
    toast(`Joined "${data.group.name}"!`);
    await loadFeed();
    go('s-feed');
  } catch(e) {
    toast(e.message || 'Invalid invite code', 'err');
  } finally {
    setLoading('join-btn', false);
  }
}

