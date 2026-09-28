// ─────────────────────────────────────────────
// Streak
// ─────────────────────────────────────────────
async function loadStreak() {
  const scroll = document.getElementById('streak-scroll');
  scroll.innerHTML = `<div class="feed-loading"><div class="spinner"></div></div>`;
  try {
    const data = await api('GET', '/streaks/me');
    const s = data.streak;
    const cal = buildCalHTML(s);
    scroll.innerHTML = `
      <div class="streak-hero">
        <span class="sh-flame">🔥</span>
        <div class="sh-num">${s.currentStreak}</div>
        <div class="sh-unit">day streak</div>
        <div class="sh-msg">${s.currentStreak > 0
          ? (s.lastCheckInDate === todayIST() ? 'Checked in today ✓' : 'Check in today to keep it going!')
          : 'Post your first mood to start your streak!'}</div>
      </div>
      <div class="cal-section">
        <h3>Last 28 days</h3>
        <div class="cal-grid">${cal}</div>
      </div>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-val" style="color:#EA580C">${s.currentStreak}</div><div class="stat-lbl">Current streak</div></div>
        <div class="stat-tile"><div class="stat-val" style="color:#D97706">${s.currentStreak}</div><div class="stat-lbl">Best streak</div></div>
      </div>`;
  } catch(e) {
    scroll.innerHTML = `<div class="empty-feed"><div class="icon">😵</div><h3>Couldn't load streak</h3></div>`;
  }
}

function buildCalHTML(streak) {
  const dLabels = ['S','M','T','W','T','F','S'];
  const labels = dLabels.map(d => `<div class="cdl">${d}</div>`).join('');
  const today = todayIST();
  const last  = streak.lastCheckInDate;
  const dots  = Array(28).fill(0).map((_, i) => {
    const date = daysAgoIST(27 - i);
    if (!last || date > last) return `<div class="cd e"></div>`;
    // Simple heuristic: mark as checked if within streak window
    const daysFromLast = daysDiff(date, last);
    if (daysFromLast < streak.currentStreak && daysFromLast >= 0) return `<div class="cd y"></div>`;
    return `<div class="cd n"></div>`;
  }).join('');
  return labels + dots;
}

