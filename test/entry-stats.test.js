const { test } = require('node:test');
const assert = require('node:assert/strict');
const { currentStreak } = require('../src/utils/entry-stats');
const { isValidDate, addDays, diffDays } = require('../src/utils/dates');

test('streak: no entries is zero', () => {
  assert.equal(currentStreak([], '2026-09-30'), 0);
});

test('streak: counts consecutive days ending today', () => {
  assert.equal(currentStreak(['2026-09-30', '2026-09-29', '2026-09-28'], '2026-09-30'), 3);
});

test('streak: still alive when today has no entry yet but yesterday does', () => {
  assert.equal(currentStreak(['2026-09-29', '2026-09-28'], '2026-09-30'), 2);
});

test('streak: over once the newest day is two or more days old', () => {
  assert.equal(currentStreak(['2026-09-28', '2026-09-27'], '2026-09-30'), 0);
});

test('streak: stops at the first gap', () => {
  assert.equal(currentStreak(['2026-09-30', '2026-09-29', '2026-09-26', '2026-09-25'], '2026-09-30'), 2);
});

test('streak: an entry dated tomorrow (the user is ahead of the clock) still counts', () => {
  assert.equal(currentStreak(['2026-10-01', '2026-09-30'], '2026-09-30'), 2);
});

test('streak: works across month and year boundaries', () => {
  assert.equal(currentStreak(['2027-01-01', '2026-12-31', '2026-12-30'], '2027-01-01'), 3);
});

test('dates: only real calendar days are valid', () => {
  assert.equal(isValidDate('2026-09-30'), true);
  assert.equal(isValidDate('2028-02-29'), true);
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('2026-9-30'), false);
  assert.equal(isValidDate('tomorrow'), false);
  assert.equal(isValidDate(undefined), false);
  assert.equal(isValidDate(20260930), false);
});

test('dates: addDays and diffDays agree', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-09-30', '2026-09-20'), 10);
  assert.equal(diffDays('2026-09-20', '2026-09-30'), -10);
});
