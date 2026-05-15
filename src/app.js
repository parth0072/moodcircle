require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// ── Body parsing ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static frontend ───────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth',                        authRoutes);
app.use('/api/groups',                      groupRoutes);
app.use('/api/groups/:groupId/moods',       moodRoutes);
app.use('/api/moods/:moodId/reactions',     reactionRoutes);
app.use('/api/groups/:groupId/nudge',       nudgeRoutes);
app.use('/api/streaks',                     streakRoutes);
app.use('/api/private',                     privateRoutes);
app.use('/api/premium',                     premiumRoutes);
app.use('/api/profile',                     profileRoutes);

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
  console.log(`MoodCircle API running on http://localhost:${PORT}`);
});

module.exports = app;
