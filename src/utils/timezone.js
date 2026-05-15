// Returns current date as YYYY-MM-DD in IST (UTC+5:30)
function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

// Returns YYYY-MM-DD for N days ago in IST
function daysAgoIST(n) {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCDate(ist.getUTCDate() - n);
  return ist.toISOString().split('T')[0];
}

// Returns the date string for yesterday in IST
function yesterdayIST() {
  return daysAgoIST(1);
}

module.exports = { todayIST, daysAgoIST, yesterdayIST };
