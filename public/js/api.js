// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const state = {
  token:         localStorage.getItem('mc_token'),
  user:          JSON.parse(localStorage.getItem('mc_user')  || 'null'),
  activeGroupId: localStorage.getItem('mc_group_id'),
  activeGroup:   null,
  allGroups:     [],
  feed:          [],
  myReactions:   {},   // `${moodId}__${type}` → reactionId
  streak:        null,
  checkedInToday: false,
  histDays:      7,
  happinessPct:  null,
};

// ─────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────

// Auto-detect base path: if app is served at /moodcircle/, API is at /moodcircle/api
const API_ROOT = (() => {
  const seg = location.pathname.split('/').filter(Boolean)[0];
  return seg ? '/' + seg + '/api' : '/api';
})();

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API_ROOT + path, opts);
  const json = await res.json();
  if (res.status === 401) { logout(); throw json; }
  if (!json.success) throw json;
  return json.data;
}

