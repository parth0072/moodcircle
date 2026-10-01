const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DB_PATH } = require('../stores/db');

// Photos of journal entries live as plain files next to the database (data/uploads, which git
// ignores, so a deploy never touches them). Set UPLOAD_DIR to keep them somewhere else.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(path.dirname(DB_PATH), 'uploads'));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = Number(process.env.PHOTO_MAX_BYTES) || 10 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const hasBytes = (buf, offset, bytes) => bytes.every((b, i) => buf[offset + i] === b);

// What the bytes really are. The Content-Type header is only a claim, and a file that is not an
// image must never be stored (or later sent back) under an image name.
function sniffType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (hasBytes(buf, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasBytes(buf, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (hasBytes(buf, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(buf, 8, [0x57, 0x45, 0x42, 0x50])) {
    return 'image/webp'; // "RIFF....WEBP"
  }
  return null;
}

function save(photoId, buf, mime) {
  const file = `${photoId}.${TYPES[mime]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
  return file;
}

function remove(file) {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(file)));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

const pathOf = (file) => path.join(UPLOAD_DIR, path.basename(file));

// A photo is fetched by an <Image> that cannot send the login header, so each photo link carries
// its own proof: an HMAC of the photo id and an expiry. The expiry is rounded to a day boundary so
// the same photo has the same link all day (the phone's image cache keeps working); a link works
// for one to two days.
const DAY = 24 * 60 * 60;
const sign = (photoId, expires) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${photoId}.${expires}`).digest('hex').slice(0, 32);

/** The path (below the API root) the app loads a photo from. */
function photoUrl(photoId) {
  const expires = (Math.floor(Date.now() / 1000 / DAY) + 2) * DAY;
  return `/journal/photos/${photoId}/file?e=${expires}&s=${sign(photoId, expires)}`;
}

function verifyLink(photoId, expires, signature) {
  const e = Number(expires);
  if (!Number.isInteger(e) || e * 1000 < Date.now() || typeof signature !== 'string') return false;
  const expected = Buffer.from(sign(photoId, e));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { MAX_BYTES, TYPES, sniffType, save, remove, pathOf, photoUrl, verifyLink };
