require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// ── Base path (set BASE_PATH=/moodcircle in cPanel env if needed) ─────────────
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');

// ── Body parsing ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static frontend ───────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(BASE || '/', express.static(publicDir));

// ── Routes ────────────────────────────────────────────
const authRoutes     = require('./routes/auth.routes');
const groupRoutes    = require('./routes/group.routes');
const moodRoutes     = require('./routes/mood.routes');
const reactionRoutes = require('./routes/reaction.routes');
const nudgeRoutes    = require('./routes/nudge.routes');
const streakRoutes   = require('./routes/streak.routes');
const privateRoutes  = require('./routes/private.routes');
const premiumRoutes  = require('./routes/premium.routes');
const profileRoutes  = require('./routes/profile.routes');

app.get(`${BASE}/api/health`, (req, res) => res.json({ ok: true }));

app.use(`${BASE}/api/auth`,                        authRoutes);
app.use(`${BASE}/api/groups`,                      groupRoutes);
app.use(`${BASE}/api/groups/:groupId/moods`,       moodRoutes);
app.use(`${BASE}/api/moods/:moodId/reactions`,     reactionRoutes);
app.use(`${BASE}/api/groups/:groupId/nudge`,       nudgeRoutes);
app.use(`${BASE}/api/streaks`,                     streakRoutes);
app.use(`${BASE}/api/private`,                     privateRoutes);
app.use(`${BASE}/api/premium`,                     premiumRoutes);
app.use(`${BASE}/api/profile`,                     profileRoutes);

// ── Fallback: serve index.html for any non-API route ─────────────────────────
app.get(`${BASE}/*`, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── 404 handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error', code: 'SERVER_ERROR' });
});

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MoodCircle API running on http://localhost:${PORT} (base: "${BASE || '/'}")`);
});

module.exports = app;
