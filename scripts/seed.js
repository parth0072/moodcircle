/**
 * seed.js — populate dev.db with dummy data
 * Run: node scripts/seed.js
 * Uses DB_PATH from .env.dev (data/dev.db) — never touches prod DB.
 */
require('dotenv').config({ path: '.env.dev' });

const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { PersistentMap } = require('../src/stores/db');

// ── Stores (same as app uses) ─────────────────────────────────────────────────
const users   = new PersistentMap('users');
const groups  = new PersistentMap('groups');
const moods   = new PersistentMap('moods');
const streaks = new PersistentMap('streaks');

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid()  { return crypto.randomUUID(); }
function today() {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function token(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ── Clear existing dev data ───────────────────────────────────────────────────
for (const k of users.keys())   users.delete(k);
for (const k of groups.keys())  groups.delete(k);
for (const k of moods.keys())   moods.delete(k);
for (const k of streaks.keys()) streaks.delete(k);
console.log('Cleared existing dev data.');

// ── Seed users ────────────────────────────────────────────────────────────────
const salt = crypto.randomBytes(16).toString('hex');
const pwHash = hashPassword('password123', salt);

const USERS = [
  { email: 'parth@test.com',  name: 'Parth',   username: 'parth',   avatar: '😎' },
  { email: 'alice@test.com',  name: 'Alice',    username: 'alice',   avatar: '🥳' },
  { email: 'bob@test.com',    name: 'Bob',      username: 'bob',     avatar: '🤗' },
  { email: 'sara@test.com',   name: 'Sara',     username: 'sara',    avatar: '😊' },
  { email: 'raj@test.com',    name: 'Raj',      username: 'raj',     avatar: '🚀' },
].map(u => ({
  id:           uid(),
  email:        u.email,
  name:         u.name,
  username:     u.username,
  avatar:       u.avatar,
  isPremium:    u.username === 'parth',
  passwordHash: pwHash,
  passwordSalt: salt,
  createdAt:    new Date().toISOString(),
}));

USERS.forEach(u => users.set(u.id, u));

const [parth, alice, bob, sara, raj] = USERS;

// ── Seed groups ───────────────────────────────────────────────────────────────
const closeCrewId = uid();
const workVibesId = uid();

const closeCrew = {
  id:         closeCrewId,
  name:       'Close Crew',
  inviteCode: 'ABC123',
  createdBy:  parth.id,
  members:    [parth.id, alice.id, bob.id, sara.id],
  createdAt:  new Date().toISOString(),
};

const workVibes = {
  id:         workVibesId,
  name:       'Work Vibes',
  inviteCode: 'XYZ789',
  createdBy:  raj.id,
  members:    [parth.id, raj.id, bob.id],
  createdAt:  new Date().toISOString(),
};

groups.set(closeCrewId, closeCrew);
groups.set(workVibesId, workVibes);

// ── Seed moods — last 7 days ──────────────────────────────────────────────────
const MOOD_LEVELS = [1, 2, 3, 4, 5];
const MOOD_NOTES  = [
  'Feeling great today!',
  'Pretty tired honestly',
  'Just vibing 🙂',
  'Rough day at work',
  'Weekend energy!',
  null, null, // some without notes
];

function randomMood() {
  return MOOD_LEVELS[Math.floor(Math.random() * MOOD_LEVELS.length)];
}
function randomNote() {
  return MOOD_NOTES[Math.floor(Math.random() * MOOD_NOTES.length)];
}

// Close Crew — past 6 days + today
for (let day = 6; day >= 0; day--) {
  const date = daysAgo(day);
  closeCrew.members.forEach(userId => {
    // 80% chance they checked in
    if (Math.random() > 0.2) {
      const id = uid();
      moods.set(id, {
        id,
        userId,
        groupId: closeCrewId,
        level:   randomMood(),
        note:    randomNote(),
        date,
        createdAt: new Date().toISOString(),
      });
    }
  });
}

// Work Vibes — today only
workVibes.members.forEach(userId => {
  const id = uid();
  moods.set(id, {
    id,
    userId,
    groupId: workVibesId,
    level:   randomMood(),
    note:    randomNote(),
    date:    today(),
    createdAt: new Date().toISOString(),
  });
});

// ── Seed streaks ──────────────────────────────────────────────────────────────
USERS.forEach(u => {
  streaks.set(u.id, {
    userId:       u.id,
    currentStreak: Math.floor(Math.random() * 10) + 1,
    longestStreak: Math.floor(Math.random() * 20) + 5,
    lastCheckinDate: today(),
  });
});

// ── Print login tokens ────────────────────────────────────────────────────────
console.log('\n✓ Dev DB seeded at:', process.env.DB_PATH);
console.log('\n── Users (password: password123) ──────────────────────────');
USERS.forEach(u => {
  console.log(`  ${u.avatar}  ${u.name.padEnd(8)} ${u.email.padEnd(22)} token: ${token(u.id)}`);
});
console.log('\n── Groups ─────────────────────────────────────────────────');
console.log(`  Close Crew  invite: ${closeCrew.inviteCode}  members: ${closeCrew.members.length}`);
console.log(`  Work Vibes  invite: ${workVibes.inviteCode}  members: ${workVibes.members.length}`);
console.log('\n── Quick login via password ────────────────────────────────');
console.log('  All users share password: password123');
console.log('  Or use any token above in browser localStorage:');
console.log('  localStorage.setItem("mc_token", "<token>")');
console.log('  localStorage.setItem("mc_user", JSON.stringify({id:"...", email:"parth@test.com", name:"Parth", ...}))');
console.log('\nRun: npm run dev\n');
