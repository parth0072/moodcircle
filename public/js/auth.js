// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
let pendingPhone = '';


// ─────────────────────────────────────────────
// Auth — OTP + Password modes
// ─────────────────────────────────────────────
let authMode = 'otp'; // 'otp' | 'password'

function toggleAuthMode() {
  authMode = authMode === 'otp' ? 'password' : 'otp';
  const pwField   = document.getElementById('auth-pw-field');
  const note      = document.getElementById('auth-note');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const btn       = document.getElementById('auth-btn');
  if (authMode === 'password') {
    pwField.style.display   = '';
    note.textContent        = 'Sign in with your password.';
    toggleBtn.textContent   = 'Use OTP instead';
    btn.textContent         = 'Sign In';
  } else {
    pwField.style.display   = 'none';
    note.textContent        = "We'll email you a one-time code. No passwords.";
    toggleBtn.textContent   = 'Sign in with password instead';
    btn.textContent         = 'Continue';
  }
}

async function doAuthSubmit() {
  if (authMode === 'password') {
    await doPasswordLogin();
  } else {
    await doRequestOTP();
  }
}

async function doRequestOTP() {
  const email = document.getElementById('auth-identifier').value.trim().toLowerCase();
  if (!email || !email.includes('@')) { toast('Enter a valid email address', 'err'); return; }
  setLoading('auth-btn', true);
  try {
    const data = await api('POST', '/auth/otp/request', { email });
    pendingPhone = email;
    document.getElementById('otp-phone-display').textContent = email;
    if (data.otp) {
      const boxes = document.querySelectorAll('.otp-d');
      data.otp.split('').forEach((d, i) => { boxes[i].value = d; boxes[i].classList.add('v'); });
    }
    go('s-otp');
  } catch(e) {
    toast(e.message || 'Failed to send OTP', 'err');
  } finally {
    setLoading('auth-btn', false);
  }
}

async function doPasswordLogin() {
  const email    = document.getElementById('auth-identifier').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  if (!email || !email.includes('@')) { toast('Enter a valid email address', 'err'); return; }
  if (!password) { toast('Enter your password', 'err'); return; }
  setLoading('auth-btn', true);
  try {
    const data = await api('POST', '/auth/password/login', { email, password });
    state.token = data.token;
    state.user  = data.user;
    localStorage.setItem('mc_token', data.token);
    localStorage.setItem('mc_user',  JSON.stringify(data.user));
    document.getElementById('auth-password').value = '';
    await boot();
  } catch(e) {
    toast(e.message || 'Invalid email or password', 'err');
  } finally {
    setLoading('auth-btn', false);
  }
}

async function doVerifyOTP() {
  const otp = [...document.querySelectorAll('.otp-d')].map(d => d.value).join('');
  if (otp.length < 6) { toast('Enter all 6 digits', 'err'); return; }
  setLoading('otp-btn', true);
  try {
    const data = await api('POST', '/auth/otp/verify', { email: pendingPhone, otp });
    state.token = data.token;
    state.user  = data.user;
    localStorage.setItem('mc_token', data.token);
    localStorage.setItem('mc_user',  JSON.stringify(data.user));
    document.querySelectorAll('.otp-d').forEach(d => { d.value = ''; d.classList.remove('v'); });
    await boot();
    // Prompt to set password if not set yet (after boot settles)
    if (!data.user.hasPassword) setTimeout(() => openPwSheet(true), 400);
  } catch(e) {
    toast(e.message || 'Invalid OTP', 'err');
  } finally {
    setLoading('otp-btn', false);
  }
}

async function doResendOTP() {
  if (!pendingPhone) return;
  try {
    const data = await api('POST', '/auth/otp/request', { email: pendingPhone });
    if (data.otp) {
      const boxes = document.querySelectorAll('.otp-d');
      data.otp.split('').forEach((d,i) => { boxes[i].value=d; boxes[i].classList.add('v'); });
    }
    toast('New OTP sent');
  } catch(e) { toast('Failed to resend', 'err'); }
}

function logout() {
  // Clear persisted session
  localStorage.removeItem('mc_token');
  localStorage.removeItem('mc_user');
  localStorage.removeItem('mc_group_id');

  // Reset all state
  state.token          = null;
  state.user           = null;
  state.activeGroup    = null;
  state.activeGroupId  = null;
  state.feed           = [];
  state.myReactions    = {};
  state.streak         = null;
  state.checkedInToday = false;
  state.happinessPct   = null;
  chosenJoyActivities  = [];

  // Close post sheet / mind-divert sheet if open
  document.getElementById('sheet-bg').classList.remove('open');
  document.getElementById('divert-sheet-bg').classList.remove('open');

  // Strip active/behind from every screen so none bleeds through
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  curScreen = null;

  // Reset auth form
  document.getElementById('auth-identifier').value = '';
  document.querySelectorAll('.otp-d').forEach(d => { d.value = ''; d.classList.remove('v'); });
  // Reset setup forms
  document.getElementById('create-name').value = '';
  document.getElementById('join-code').value = '';
  document.getElementById('ps-name').value = '';
  document.getElementById('ps-username').value = '';
  document.getElementById('joy-custom-input').value = '';

  // Reset feed / dynamic screens to loading placeholder so stale data
  // never flashes if the user logs back in during the same session
  document.getElementById('feed-scroll').innerHTML =
    `<div class="feed-loading"><div class="spinner"></div></div>`;
  document.getElementById('hist-scroll').innerHTML =
    `<div class="feed-loading"><div class="spinner"></div></div>`;
  document.getElementById('streak-scroll').innerHTML =
    `<div class="feed-loading"><div class="spinner"></div></div>`;
  document.getElementById('feed-group-name').textContent = 'Loading…';
  document.getElementById('feed-group-meta').textContent = '';

  // Land on auth
  go('s-auth');
}

// OTP box keyboard wiring
document.querySelectorAll('.otp-d').forEach((el, i, all) => {
  el.addEventListener('input', () => {
    el.classList.toggle('v', !!el.value);
    if (el.value && i < 5) all[i+1].focus();
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !el.value && i > 0) all[i-1].focus();
  });
});

// ─────────────────────────────────────────────
// Password sheet
// ─────────────────────────────────────────────
function openPwSheet(isFirstTime = false) {
  document.getElementById('pw-sheet-title').textContent = isFirstTime ? 'Set a quick-login password' : 'Change password';
  document.getElementById('pw-sheet-sub').textContent   = isFirstTime
    ? 'Next time you can sign in instantly — no OTP needed.'
    : 'Update your password for quick login.';
  document.getElementById('pw-skip-btn').style.display  = isFirstTime ? '' : 'none';
  document.getElementById('pw-new').value     = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-sheet').style.display = 'flex';
}

function closePwSheet() {
  document.getElementById('pw-sheet').style.display = 'none';
}

async function doSetPassword() {
  const pw  = document.getElementById('pw-new').value;
  const pw2 = document.getElementById('pw-confirm').value;
  if (pw.length < 6)  { toast('Password must be at least 6 characters', 'err'); return; }
  if (pw !== pw2)     { toast('Passwords do not match', 'err'); return; }
  setLoading('pw-save-btn', true);
  try {
    await api('POST', '/auth/password/set', { password: pw });
    state.user.hasPassword = true;
    localStorage.setItem('mc_user', JSON.stringify(state.user));
    closePwSheet();
    toast('Password set! You can now sign in quickly.');
  } catch(e) {
    toast(e.message || 'Failed to set password', 'err');
  } finally {
    setLoading('pw-save-btn', false);
  }
}

