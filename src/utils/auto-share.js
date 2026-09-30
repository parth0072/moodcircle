const crypto = require('crypto');
const { groups, moods, reactions } = require('../stores');
const entries = require('../stores/entries');
const { todayIST } = require('./timezone');
const { addDays, todayUTC } = require('./dates');
const { updateStreak } = require('./streak');
const { levelFor } = require('./group-moods');

// "Share my check-ins here": a group the user switched this on for shows the latest thing they
// logged today in their personal journal, and nothing when they logged nothing. Group posts are one
// per IST day, so "today" here is the IST day the entry was created on.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDay = (iso) => new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().split('T')[0];

function latestEntryToday(userId, today) {
  // An entry made today (IST) carries a day within one of UTC's today, so a 3-day window is enough.
  const t = todayUTC();
  return entries
    .list(userId, addDays(t, -1), addDays(t, 1))
    .filter((e) => istDay(e.createdAt) === today)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .pop();
}

function removePost(post) {
  for (const r of [...reactions.values()]) if (r.moodId === post.id) reactions.delete(r.id);
  moods.delete(post.id);
}

/**
 * Brings every auto-sharing group of `userId` in line with their journal. Call it after any change
 * to their entries, and when they switch sharing on. A post the person wrote themselves is never
 * touched. It never throws: a problem here must not fail the entry change that triggered it.
 */
function syncAutoShare(userId) {
  try {
    const sharing = [...groups.values()].filter(
      (g) => g.members.includes(userId) && g.autoShare && g.autoShare[userId]
    );
    if (sharing.length === 0) return;

    const today = todayIST();
    const latest = latestEntryToday(userId, today);
    const mine = [...moods.values()].filter((m) => m.userId === userId && m.date === today);

    for (const group of sharing) {
      const existing = mine.find((m) => m.groupId === group.id);
      if (existing && existing.source !== 'auto') continue;

      if (!latest) {
        if (existing) removePost(existing);
      } else if (existing) {
        if (existing.emotion !== latest.emotion) {
          moods.set(existing.id, { ...existing, emotion: latest.emotion, level: levelFor(latest.emotion) });
        }
      } else {
        const id = crypto.randomUUID();
        moods.set(id, {
          id,
          userId,
          groupId: group.id,
          level: levelFor(latest.emotion),
          emotion: latest.emotion,
          note: '', // the journal note is private: only the emotion is shared
          privateNote: '',
          isAnonymous: false,
          source: 'auto',
          date: today,
          createdAt: latest.createdAt,
        });
        updateStreak(userId);
      }
    }
  } catch (err) {
    console.error('[auto-share]', err);
  }
}

module.exports = { syncAutoShare };
