const { diffDays } = require('./dates');

// Consecutive days with at least one entry. `datesDesc` are distinct YYYY-MM-DD days, newest
// first. The streak is still alive if the newest day is today or yesterday (today's check-in
// may simply not have happened yet); anything older means it has ended.
function currentStreak(datesDesc, today) {
  if (datesDesc.length === 0 || diffDays(today, datesDesc[0]) > 1) return 0;
  let streak = 1;
  for (let i = 1; i < datesDesc.length; i++) {
    if (diffDays(datesDesc[i - 1], datesDesc[i]) !== 1) break;
    streak++;
  }
  return streak;
}

module.exports = { currentStreak };
