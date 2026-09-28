// ─────────────────────────────────────────────
// Feed
// ─────────────────────────────────────────────
async function loadFeed() {
  if (!state.activeGroupId) return;
  const scroll = document.getElementById('feed-scroll');
  scroll.innerHTML = `<div class="feed-loading"><div class="spinner"></div></div>`;

  try {
    const [feedData, streakData, groupData] = await Promise.all([
      api('GET', `/groups/${state.activeGroupId}/moods/today`),
      api('GET', '/streaks/me'),
      api('GET', `/groups/${state.activeGroupId}`),
    ]);

    state.feed    = feedData.feed;
    state.streak  = streakData.streak;
    state.activeGroup = groupData.group;

    // Build myReactions map from feed
    state.myReactions = {};
    for (const item of feedData.feed) {
      for (const rxn of item.reactions) {
        if (rxn.userId === state.user?.id) {
          state.myReactions[`${item.id}__${rxn.type}`] = rxn.id;
        }
      }
    }

    state.checkedInToday = feedData.feed.some(m => m.isOwn);

    // Update topbar
    document.getElementById('feed-group-name').textContent = state.activeGroup.name;
    document.getElementById('feed-group-meta').textContent =
      `${state.activeGroup.memberCount} members · #${state.activeGroup.inviteCode}`;
    // Show chevron if user has multiple groups
    document.getElementById('feed-group-chevron').style.display =
      (state.allGroups && state.allGroups.length > 1) ? '' : 'none';

    renderFeed(feedData);
  } catch(e) {
    scroll.innerHTML = `
      <div class="empty-feed">
        <div class="icon">😵</div>
        <h3>Couldn't load feed</h3>
        <p>${e.message || 'Something went wrong'}</p>
        <button class="btn btn-outline" style="margin-top:10px" onclick="loadFeed()">Retry</button>
      </div>`;
  }
}

function renderFeed({ feed, vibeScore, checkedIn, totalMembers } = {}) {
  feed = feed || state.feed;
  const scroll = document.getElementById('feed-scroll');
  const parts  = [];

  // Vibe row
  const vibeText = vibeScore
    ? `${vibeScore.toFixed(1)} / 5 — ${vibeLabel(vibeScore)}`
    : 'No check-ins yet';

  const memberDots = state.activeGroup
    ? buildMemberDots(feed, totalMembers || state.activeGroup.memberCount)
    : '';

  parts.push(`
    <div class="vibe-row">
      <div>
        <div class="vibe-score">${vibeScore ? vibeScore.toFixed(1) + ' / 5' : '—'}</div>
        <div class="vibe-sub">${vibeScore ? vibeLabel(vibeScore) : 'No check-ins yet'}</div>
      </div>
      <div style="text-align:right">
        <div class="member-row" style="justify-content:flex-end">${memberDots}</div>
        <div class="checkin-count">${checkedIn || 0} of ${totalMembers || '?'} checked in</div>
      </div>
    </div>
  `);

  // Streak
  if (state.streak && state.streak.currentStreak > 0) {
    const s = state.streak;
    parts.push(`
      <div class="streak-pill">
        <span class="icon">🔥</span>
        <div class="text">
          <strong>${s.currentStreak}-day streak</strong>
          <small>${s.lastCheckInDate === todayIST() ? 'Checked in today ✓' : 'Check in to keep it alive'}</small>
        </div>
        <span class="streak-count">${s.currentStreak}</span>
      </div>`);
  }

  // Checkin CTA
  if (!state.checkedInToday) {
    parts.push(`
      <div class="checkin-bar" id="checkin-bar">
        <span class="icon">✦</span>
        <div class="text">
          <h3>How are you feeling?</h3>
          <p>Your circle is waiting</p>
        </div>
        <button onclick="openSheet()">Check in</button>
      </div>`);
  }

  // Mood cards
  parts.push(`
    <div class="sec-head">
      <span>Today's moods</span>
      <a onclick="navTo('s-hist')">History →</a>
    </div>`);

  if (!feed.length) {
    parts.push(`
      <div class="empty-feed">
        <div class="icon">🌅</div>
        <h3>No check-ins yet</h3>
        <p>Be the first to share how you're feeling today.</p>
      </div>`);
  } else {
    for (const item of feed) parts.push(moodCardHTML(item));
  }

  scroll.innerHTML = parts.join('');
}

function buildMemberDots(feed, total) {
  const checkedUserIds = new Set(feed.filter(m => !m.isAnonymous && m.user?.id).map(m => m.user.id));
  const checked = feed.length;
  const pending = Math.max(0, total - checked);
  let html = '';
  let n = 0;
  for (const item of feed) {
    if (n >= 6) break;
    const col = item.isAnonymous ? '#A1A1AA' : idColor(item.user?.id || '');
    const lbl = item.isAnonymous ? '?' : phoneInitials(item.user?.phone);
    html += `<div class="m-dot" style="background:${col}" title="${item.isAnonymous ? 'Anonymous' : (item.user?.phone||'')}">${lbl}</div>`;
    n++;
  }
  for (let i = 0; i < Math.min(pending, 6-n); i++) {
    html += `<div class="m-dot wait">·</div>`;
  }
  return html;
}

function moodCardHTML(item) {
  const isAnon = item.isAnonymous;
  const isOwn  = item.isOwn;
  const level  = item.level;
  const u      = item.user || {};
  const col    = isAnon ? '#A1A1AA' : idColor(u.id || '');
  const hasEmoji = !isAnon && u.avatar;
  const initials = isAnon ? '👤' : (u.avatar || (u.name ? u.name[0].toUpperCase() : phoneInitials(u.phone)));
  const displayName = isAnon ? 'Someone' : (u.name || (u.username ? '@' + u.username : (u.phone ? '···' + u.phone.slice(-4) : 'Unknown')));
  const time   = new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const avStyle = isAnon
    ? `class="av av-anon"`
    : hasEmoji
      ? `class="av" style="background:var(--p-dim);font-size:28px"`
      : `class="av" style="background:${col}"`;

  const nameTags = [
    isAnon ? `<span class="anon-tag">anonymous</span>` : '',
    isOwn  ? `<span class="you-tag">you</span>` : '',
  ].join('');

  // Pips
  const pips = [1,2,3,4,5].map(i =>
    `<div class="pip" style="${i<=level ? 'background:'+MOOD_COLOR[level] : ''}"></div>`
  ).join('');

  // Reactions
  const rxnCounts = {};
  for (const rxn of item.reactions) rxnCounts[rxn.type] = (rxnCounts[rxn.type]||0) + 1;

  const rxnHTML = RXN_MAP.map(r => {
    const count = rxnCounts[r.key] || 0;
    const mine  = !!state.myReactions[`${item.id}__${r.key}`];
    return `<button class="rxn${mine?' on':''}" onclick="toggleRxn('${item.id}','${r.key}',this)">${r.emoji} <span class="rc">${count}</span></button>`;
  }).join('');

  // Nudge (only for non-anonymous, non-self). Rough/Low posts get a
  // distinct "support" nudge instead of a playful one.
  const isLow = level <= 2;
  const nudgeHTML = (!isAnon && !isOwn && item.user?.id)
    ? `<button class="nudge-btn${isLow ? ' support' : ''}" onclick="doNudge('${item.user.id}',this)">${isLow ? '💙 Send support' : '👋 Nudge'}</button>`
    : '';

  return `
    <div class="mcard">
      <div class="mcard-top">
        <div ${avStyle}>${initials}</div>
        <div class="mc-info">
          <div class="mc-name">${displayName} ${nameTags}</div>
          <div class="mc-time">${time}</div>
        </div>
        <div class="mood-chip" style="background:${MOOD_BG[level]};color:${MOOD_TEXT[level]}">
          ${moodIconSVG(level, 15)} ${MOOD_LABEL[level]}
        </div>
      </div>
      <div class="pips">${pips}</div>
      ${item.note ? `<div class="mc-note">"${escHtml(item.note)}"</div>` : ''}
      <div class="rxn-row">${rxnHTML}${nudgeHTML}</div>
    </div>`;
}

// ─────────────────────────────────────────────
// Reactions
// ─────────────────────────────────────────────
async function toggleRxn(moodId, type, btn) {
  const key = `${moodId}__${type}`;
  const rc  = btn.querySelector('.rc');
  const isOn = !!state.myReactions[key];

  if (isOn) {
    // Remove
    try {
      await api('DELETE', `/moods/${moodId}/reactions/${state.myReactions[key]}`);
      delete state.myReactions[key];
      btn.classList.remove('on');
      rc.textContent = Math.max(0, parseInt(rc.textContent) - 1);
    } catch(e) { toast(e.message || 'Could not remove reaction', 'err'); }
  } else {
    // Add
    try {
      const data = await api('POST', `/moods/${moodId}/reactions`, { type });
      state.myReactions[key] = data.reaction.id;
      btn.classList.add('on');
      rc.textContent = parseInt(rc.textContent) + 1;
    } catch(e) { toast(e.message || 'Could not react', 'err'); }
  }
}

// ─────────────────────────────────────────────
// Nudge
// ─────────────────────────────────────────────
async function doNudge(targetUserId, btn) {
  if (btn.classList.contains('sent')) { toast('Already nudged today'); return; }
  try {
    await api('POST', `/groups/${state.activeGroupId}/nudge`, { targetUserId });
    btn.classList.add('sent');
    btn.textContent = '✓ Nudged';
    toast('Nudge sent 👋');
  } catch(e) {
    toast(e.message || 'Could not send nudge', 'err');
  }
}

// ─────────────────────────────────────────────
// Post Mood
// ─────────────────────────────────────────────
let chosenMood = null;

function openSheet() {
  if (!state.activeGroup) { toast('Join a group first', 'err'); return; }
  document.getElementById('sh-sub').textContent = state.activeGroup.name + ' · today';
  document.getElementById('sheet-bg').classList.add('open');
}
function closeSheetBg(e) {
  if (e.target === document.getElementById('sheet-bg'))
    document.getElementById('sheet-bg').classList.remove('open');
}
function pick(lvl, el) {
  chosenMood = lvl;
  document.querySelectorAll('.m-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}
function togglePriv() {
  const t = document.getElementById('tgl-priv'); t.classList.toggle('on');
  document.getElementById('priv-note').style.display = t.classList.contains('on') ? 'block' : 'none';
}

async function doPostMood() {
  if (!chosenMood) { toast('Pick your mood first', 'err'); return; }
  const note        = document.getElementById('mood-note').value.trim();
  const privateNote = document.getElementById('priv-note').value.trim();
  const isAnonymous = document.getElementById('tgl-anon').classList.contains('on');

  setLoading('post-btn', true);
  try {
    await api('POST', `/groups/${state.activeGroupId}/moods`, {
      level: chosenMood, note, privateNote, isAnonymous,
    });
    // Close sheet and reset
    const postedLevel = chosenMood;
    document.getElementById('sheet-bg').classList.remove('open');
    chosenMood = null;
    document.querySelectorAll('.m-opt').forEach(o => o.classList.remove('sel'));
    document.getElementById('mood-note').value = '';
    document.getElementById('priv-note').value = '';
    document.getElementById('tgl-anon').classList.remove('on');
    document.getElementById('tgl-priv').classList.remove('on');
    document.getElementById('priv-note').style.display = 'none';
    toast('Mood posted ✓');
    await loadFeed(); // Reload with fresh data
    // Rough/Low check-ins get a gentle, personalized diversion suggestion
    setTimeout(() => maybeShowDivert(postedLevel), 400);
  } catch(e) {
    toast(e.message || 'Could not post mood', 'err');
  } finally {
    setLoading('post-btn', false);
  }
}

// ─────────────────────────────────────────────
// Mind-divert — a gentle nudge toward something that helps, shown
// after a Rough/Low check-in. Prefers the user's own "things that make
// you feel good" list; falls back to generic grounding tasks.
// ─────────────────────────────────────────────
const GROUNDING_TASKS = [
  'Take 5 slow, deep breaths',
  'Name 3 things you can see right now',
  'Step outside for 60 seconds',
  'Drink a glass of water, slowly',
  'Stretch your arms overhead for 20 seconds',
  'Text someone "thinking of you"',
  "Write down one thing that's okay right now",
  'Unclench your jaw and drop your shoulders',
];
let divertPool     = [];
let divertUsingJoy = false;
let divertLastIdx  = -1;

function maybeShowDivert(level) {
  if (level > 2) return; // only for Rough(1) / Low(2)
  // Dismiss the "Mood posted" toast first — it's bottom-anchored like this
  // sheet and would otherwise sit overlapping its buttons for a couple seconds.
  clearTimeout(toastT);
  document.getElementById('toast').className = '';
  const joy = Array.isArray(state.user?.joyActivities) ? state.user.joyActivities : [];
  divertUsingJoy = joy.length > 0;
  divertPool     = divertUsingJoy ? joy : GROUNDING_TASKS;
  divertLastIdx  = -1;
  showDivertPick();
  document.getElementById('divert-tip').style.display        = divertUsingJoy ? 'none' : '';
  document.getElementById('divert-switch-btn').style.display  = divertUsingJoy ? '' : 'none';
  document.getElementById('divert-sheet-bg').classList.add('open');
}

function showDivertPick() {
  let idx = Math.floor(Math.random() * divertPool.length);
  if (divertPool.length > 1 && idx === divertLastIdx) idx = (idx + 1) % divertPool.length;
  divertLastIdx = idx;
  document.getElementById('divert-text').textContent = divertPool[idx];
}

function anotherDivertIdea() { showDivertPick(); }

function switchToGroundingReset() {
  divertUsingJoy = false;
  divertPool     = GROUNDING_TASKS;
  divertLastIdx  = -1;
  showDivertPick();
  document.getElementById('divert-tip').style.display = 'none';
  document.getElementById('divert-switch-btn').style.display = 'none';
}

function closeDivertSheet(e) {
  if (!e || e.target === document.getElementById('divert-sheet-bg'))
    document.getElementById('divert-sheet-bg').classList.remove('open');
}

