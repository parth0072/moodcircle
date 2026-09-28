// ─────────────────────────────────────────────
// History
// ─────────────────────────────────────────────
async function loadHistory(days = 7) {
  state.histDays = days;
  const scroll = document.getElementById('hist-scroll');
  scroll.innerHTML = `<div class="feed-loading"><div class="spinner"></div></div>`;

  try {
    const [histData, streakData] = await Promise.all([
      api('GET', `/groups/${state.activeGroupId}/moods/history?days=${days}`),
      api('GET', '/streaks/me'),
    ]);
    const history = histData.history;
    const streak  = streakData.streak;

    // Build daily averages for chart
    const daily = buildDailyData(history, days);
    const labels = daily.map(d => shortDay(d.date));
    const vals   = daily.map(d => d.avg);
    const daysCheckedIn = daily.filter(d => d.avg > 0).length;
    const avgMood = vals.filter(v=>v>0).length
      ? (vals.filter(v=>v>0).reduce((a,b)=>a+b,0) / vals.filter(v=>v>0).length).toFixed(1)
      : '—';
    const happinessPct = avgMood === '—' ? null : Math.round(parseFloat(avgMood) / 5 * 100);
    state.happinessPct = happinessPct;

    const tabsHTML = [7,30,90].map(d =>
      `<button class="p-tab${d===days?' on':''}" onclick="loadHistory(${d})">${d} days</button>`
    ).join('');

    scroll.innerHTML = `
      <div class="period-row">${tabsHTML}</div>
      <div class="chart-wrap">
        <h3>Happiness Index</h3>
        <p>Daily average over ${days} days</p>
        <div class="bar-chart" id="hist-chart"></div>
      </div>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-val" style="color:var(--p)">${happinessPct===null ? '—' : happinessPct+'%'}</div><div class="stat-lbl">Happiness Index</div></div>
        <div class="stat-tile"><div class="stat-val" style="color:#DB2777">${daysCheckedIn}</div><div class="stat-lbl">Days checked in</div></div>
        <div class="stat-tile"><div class="stat-val" style="color:#22C55E">${streak.currentStreak}</div><div class="stat-lbl">Current streak</div></div>
        <div class="stat-tile"><div class="stat-val" style="color:#F59E0B">${history.length}</div><div class="stat-lbl">Total check-ins</div></div>
      </div>`;

    buildBarChart('hist-chart', labels, vals);
  } catch(e) {
    scroll.innerHTML = `<div class="empty-feed"><div class="icon">😵</div><h3>Couldn't load history</h3><p>${e.message||''}</p></div>`;
  }
}

function shareHappinessNow() { shareHappiness(state.happinessPct, state.histDays); }

async function shareHappiness(pct, days) {
  if (pct === null || pct === undefined) { toast('Check in a few times first', 'err'); return; }
  const mood = pct >= 70 ? '🌟' : pct >= 50 ? '😊' : '💙';
  const text = `My MoodCircle happiness index (last ${days}d): ${pct}% ${mood}`;
  if (navigator.share) {
    try { await navigator.share({ text, title: 'MoodCircle' }); } catch(e) { /* user cancelled — ignore */ }
  } else if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); toast('Copied — share it with your circle!'); }
    catch(e) { toast('Could not copy', 'err'); }
  } else {
    toast('Sharing not supported on this browser', 'err');
  }
}

function buildDailyData(history, days) {
  const byDay = {};
  for (const m of history) {
    if (!byDay[m.date]) byDay[m.date] = [];
    byDay[m.date].push(m.level);
  }
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgoIST(i);
    const entries = byDay[date] || [];
    const avg = entries.length
      ? parseFloat((entries.reduce((a,b)=>a+b,0)/entries.length).toFixed(1))
      : 0;
    result.push({ date, avg, count: entries.length });
  }
  return result;
}

function buildBarChart(id, labels, vals) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = labels.map((l,i) => {
    const v   = vals[i];
    const pct = Math.round(v/5*100);
    const col = v > 0 ? MOOD_COLOR[Math.round(v)] : 'var(--border)';
    return `<div class="bc">
      <div class="bv">${v||''}</div>
      <div class="bb" style="height:${Math.max(pct,4)}%;background:${col}"></div>
      <div class="bl">${l}</div>
    </div>`;
  }).join('');
}

