const { PersistentMap } = require('./db');

// SQLite-backed stores — data survives server restarts
const users        = new PersistentMap('users');
const otps         = new PersistentMap('otps');
const groups       = new PersistentMap('groups');
const moods        = new PersistentMap('moods');
const reactions    = new PersistentMap('reactions');
const nudges       = new PersistentMap('nudges');
const streaks      = new PersistentMap('streaks');
const privatePairs = new PersistentMap('private_pairs');
const privateMoods = new PersistentMap('private_moods');

module.exports = {
  users,
  otps,
  groups,
  moods,
  reactions,
  nudges,
  streaks,
  privatePairs,
  privateMoods,
};
