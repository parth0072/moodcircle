// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function todayIST() {
  const ist = new Date(Date.now() + 5.5*60*60*1000);
  return ist.toISOString().split('T')[0];
}
function daysAgoIST(n) {
  const ist = new Date(Date.now() + 5.5*60*60*1000);
  ist.setUTCDate(ist.getUTCDate() - n);
  return ist.toISOString().split('T')[0];
}
function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function shortDay(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0,2);
}
function idColor(id) {
  let n = 0; for (const c of id) n += c.charCodeAt(0);
  return AV_COLORS[n % AV_COLORS.length];
}
function phoneInitials(phone) {
  if (!phone) return '?';
  return phone.slice(-2);
}
function vibeLabel(score) {
  if (score >= 4.5) return 'Amazing vibes 🌟';
  if (score >= 3.5) return 'Good energy 😊';
  if (score >= 2.5) return 'Mixed feelings 😌';
  if (score >= 1.5) return 'Rough day 😕';
  return 'Tough times 😞';
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn._orig = btn.innerHTML; btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>`; }
  else if (btn._orig) btn.innerHTML = btn._orig;
}

let toastT;
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show' + (type === 'err' ? ' err' : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = '', 2600);
}

