const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'moodcircle.db');

// Ensure the data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * PersistentMap — drop-in replacement for the in-memory Maps.
 * Stores values as JSON in a simple key/value table so no
 * controller code needs to change.
 */
class PersistentMap {
  constructor(tableName) {
    this.t = tableName;
    db.exec(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (
         k TEXT PRIMARY KEY,
         v TEXT NOT NULL
       )`
    );
    this._get  = db.prepare(`SELECT v FROM "${tableName}" WHERE k = ?`);
    this._set  = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (k, v) VALUES (?, ?)`);
    this._del  = db.prepare(`DELETE FROM "${tableName}" WHERE k = ?`);
    this._has  = db.prepare(`SELECT 1 FROM "${tableName}" WHERE k = ?`);
    this._all  = db.prepare(`SELECT k, v FROM "${tableName}"`);
    this._keys = db.prepare(`SELECT k FROM "${tableName}"`);
  }

  get(key)        { const r = this._get.get(String(key)); return r ? JSON.parse(r.v) : undefined; }
  set(key, value) { this._set.run(String(key), JSON.stringify(value)); return this; }
  delete(key)     { this._del.run(String(key)); return true; }
  has(key)        { return !!this._has.get(String(key)); }
  values()        { return this._all.all().map(r => JSON.parse(r.v)); }
  keys()          { return this._keys.all().map(r => r.k); }
  entries()       { return this._all.all().map(r => [r.k, JSON.parse(r.v)]); }
  [Symbol.iterator]() { return this.entries()[Symbol.iterator](); }
}

module.exports = { PersistentMap };
