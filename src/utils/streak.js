const { streaks } = require('../stores');
const { todayIST, yesterdayIST } = require('./timezone');

function updateStreak(userId) {
  const today = todayIST();
  const yesterday = yesterdayIST();
  const record = streaks.get(userId);

  if (!record) {
    streaks.set(userId, { currentStreak: 1, lastCheckInDate: today });
    return;
  }

  if (record.lastCheckInDate === today) return; // already checked in today

  if (record.lastCheckInDate === yesterday) {
    streaks.set(userId, { currentStreak: record.currentStreak + 1, lastCheckInDate: today });
  } else {
    // Gap of more than 1 day — reset
    streaks.set(userId, { currentStreak: 1, lastCheckInDate: today });
  }
}

function getStreak(userId) {
  return streaks.get(userId) || { currentStreak: 0, lastCheckInDate: null };
}

module.exports = { updateStreak, getStreak };
