#!/usr/bin/env node
// Prove that the app's zod schemas match what the real backend sends, and that the error codes
// the app reacts to still exist. Starts a throwaway backend, drives every endpoint the app
// uses through a realistic two-user scenario, and parses each response with the schemas.
//
// Run it after changing the backend or anything in src/api/schemas. Unknown extra fields do not
// fail (zod strips them); missing or retyped fields do.
//
// Usage: node contract-check.mjs [--project mobile] [--schemas <dir>]
// The schema files are TypeScript and are loaded as-is with Node's type stripping; the script
// re-runs itself once with the flags that needs (Node 22.13 to 22.17 require one).

import { spawnSync } from 'node:child_process';
import { register } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { makeApi, startBackend } from './lib/backend.mjs';

const { values: args } = parseArgs({
  options: { project: { type: 'string', default: 'mobile' }, schemas: { type: 'string' } },
});

// Re-run once under the flags we need: type stripping (not default before Node 22.18) and no
// MODULE_TYPELESS_PACKAGE_JSON noise (the Expo project's package.json has no "type", so Node
// warns per schema file). The warning is raised on the loader thread, so only a CLI flag hides it.
if (!process.env.MC_CONTRACT_CHILD) {
  const flags = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON'];
  if (!process.features.typescript) flags.push('--experimental-strip-types');
  const child = spawnSync(process.execPath, [...flags, import.meta.filename, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, MC_CONTRACT_CHILD: '1' },
  });
  process.exit(child.status ?? 1);
}

register('./lib/ts-resolve-hooks.mjs', import.meta.url);

const schemaDir = resolve(args.schemas ?? join(args.project, 'src/api/schemas'));
const load = (name) => import(pathToFileURL(join(schemaDir, `${name}.ts`)).href);
const S = {};
for (const name of ['auth', 'group', 'mood', 'nudge', 'streak', 'entry']) {
  try {
    Object.assign(S, await load(name));
  } catch (e) {
    console.error(`cannot load ${join(schemaDir, `${name}.ts`)}: ${e.message}`);
    process.exit(2);
  }
}

const results = [];
const check = (ok, label) => results.push({ ok: !!ok, label });
const parses = (schema, data, label) => {
  const r = schema.safeParse(data);
  const issue = r.success ? '' : ` (${r.error.issues[0].path.join('.') || '<root>'}: ${r.error.issues[0].message})`;
  check(r.success, `${label} matches its schema${issue}`);
  return r.success ? r.data : undefined;
};
const errorOf = async (promise) => promise.then(() => null, (e) => e);
const failsWith = async (promise, status, code, label) => {
  const e = await errorOf(promise);
  check(e && e.status === status && e.code === code, `${label} -> ${status} ${code}${e ? '' : ' (but it succeeded)'}${e && e.code !== code ? ` (got ${e.status} ${e.code})` : ''}`);
};

const backend = await startBackend();
let failed = false;
try {
  const base = `http://127.0.0.1:${backend.port}`;
  const api = makeApi(base);
  const { request, raw } = api;
  const uuid = '00000000-0000-4000-8000-000000000000';

  // ── health is NOT enveloped ──
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  check(health.ok === true && !('success' in health), 'GET /api/health returns bare { ok: true }');

  // ── OTP sign-in ──
  const emailA = api.uniqueEmail('asha');
  const otpReq = await raw('POST', '/auth/otp/request', { email: emailA });
  parses(S.otpRequestResponse, otpReq.json.data, 'POST /auth/otp/request');
  check(typeof otpReq.json.data.otp === 'string', 'otp is returned outside production (app must never read it)');
  await failsWith(request('POST', '/auth/otp/verify', { email: emailA, otp: '000000' }), 400, 'OTP_INVALID', 'wrong code');
  const verified = await raw('POST', '/auth/otp/verify', { email: emailA, otp: otpReq.json.data.otp });
  const A = parses(S.authResponse, verified.json.data, 'POST /auth/otp/verify');
  check(A?.user.name === null && A?.user.joyOnboarded === false, 'a new account has no name and joyOnboarded=false');
  await failsWith(request('POST', '/auth/otp/request', { email: 'not-an-email' }), 422, 'VALIDATION_ERROR', 'invalid email');

  // ── profile ──
  const usernameA = `asha_${Date.now().toString(36)}`.slice(0, 20);
  const patched = await request('PATCH', '/profile', { name: 'Asha', username: usernameA, avatar: '🙂', joyActivities: ['walk', 'tea'] }, A.token);
  const pa = parses(S.profileResponse, patched, 'PATCH /profile');
  check(pa?.user.joyOnboarded === true && pa?.user.joyActivities.length === 2, 'saving joyActivities sets joyOnboarded');
  const me = parses(S.profileResponse, await request('GET', '/profile/me', undefined, A.token), 'GET /profile/me');
  check(me && !('email' in me.user && me.user.email), 'GET /profile/me omits email (merge it into the session user)');

  const B = await api.signIn(api.uniqueEmail('ben'));
  await failsWith(request('PATCH', '/profile', { username: usernameA.toUpperCase() }, B.token), 409, 'USERNAME_TAKEN', 'taken username (case-insensitive)');
  await request('PATCH', '/profile', { name: 'Ben', username: `ben_${Date.now().toString(36)}`.slice(0, 20) }, B.token);

  // ── groups ──
  const created = parses(S.groupResponse, await request('POST', '/groups', { name: 'Test circle' }, A.token), 'POST /groups');
  const g = created.group;
  check(g.isAdmin === true && g.memberCount === 1 && /^[0-9A-F]{6}$/.test(g.inviteCode), 'creator is admin, 1 member, 6-char hex invite code');
  check(parses(S.groupsResponse, await request('GET', '/groups', undefined, A.token), 'GET /groups')?.groups.length === 1, 'GET /groups lists the group');
  await failsWith(request('POST', '/groups/join', { inviteCode: 'ZZZZZZ' }, B.token), 404, 'INVALID_INVITE_CODE', 'bad invite code');
  const joined = parses(S.groupResponse, await request('POST', '/groups/join', { inviteCode: g.inviteCode.toLowerCase() }, B.token), 'POST /groups/join (lower-case code)');
  check(joined?.group.memberCount === 2 && joined?.group.isAdmin === false, 'joiner is a non-admin, 2 members');
  await failsWith(request('POST', '/groups/join', { inviteCode: g.inviteCode }, B.token), 409, 'ALREADY_MEMBER', 'joining twice');
  const detail = parses(S.groupDetailResponse, await request('GET', `/groups/${g.id}`, undefined, A.token), 'GET /groups/:id');
  check(detail?.members.length === 2, 'group detail lists both members');

  // ── moods ──
  const postA = parses(S.postMoodResponse, await request('POST', `/groups/${g.id}/moods`, { level: 2, note: 'Rough morning', privateNote: 'secret', isAnonymous: false }, A.token), 'POST .../moods');
  check(postA && postA.mood.isOwn && !('privateNote' in postA.mood), 'own post is isOwn and never echoes privateNote');
  await failsWith(request('POST', `/groups/${g.id}/moods`, { level: 3 }, A.token), 409, 'ALREADY_CHECKED_IN', 'second check-in the same IST day');
  const postB = parses(S.postMoodResponse, await request('POST', `/groups/${g.id}/moods`, { level: 4, isAnonymous: true }, B.token), 'POST .../moods (anonymous)');
  check(postB?.mood.user.anonymous === true, 'anonymous post hides the author');
  await failsWith(request('POST', `/groups/${g.id}/moods`, { level: 9 }, B.token), 422, 'VALIDATION_ERROR', 'level out of range');

  // ── reactions ──
  const rxn = parses(S.reactionResponse, await request('POST', `/moods/${postA.mood.id}/reactions`, { type: 'sending_love' }, B.token), 'POST .../reactions');
  await failsWith(request('POST', `/moods/${postA.mood.id}/reactions`, { type: 'sending_love' }, B.token), 409, 'DUPLICATE_REACTION', 'same reaction twice');
  await failsWith(request('POST', `/moods/${postA.mood.id}/reactions`, { type: 'nope' }, B.token), 422, 'VALIDATION_ERROR', 'unknown reaction type');

  // ── feeds ──
  const today = parses(S.todayResponse, await request('GET', `/groups/${g.id}/moods/today`, undefined, A.token), 'GET .../moods/today');
  check(today?.checkedIn === 2 && today?.totalMembers === 2 && today?.vibeScore === 3, 'today: 2 of 2 checked in, vibeScore is the mean (3)');
  check(today?.feed.find((f) => f.id === postA.mood.id)?.reactions.length === 1, "the reaction shows on A's feed item");
  const hist = parses(S.historyResponse, await request('GET', `/groups/${g.id}/moods/history?days=7`, undefined, A.token), 'GET .../moods/history?days=7');
  check(hist?.history.length === 2 && hist.days === 7, 'history covers the whole group, not just the caller');
  await failsWith(request('GET', `/groups/${g.id}/moods/history?days=5`, undefined, A.token), 422, 'VALIDATION_ERROR', 'days must be 7, 30 or 90');
  parses(S.messageResponse, await request('DELETE', `/moods/${postA.mood.id}/reactions/${rxn.reaction.id}`, undefined, B.token), 'DELETE .../reactions/:id');

  // ── the Moodbloom group screens: colour, mood-only, preview, overview, emotions, auto-share ──
  const quiet = parses(S.groupResponse, await request('POST', '/groups', { name: 'Quiet circle', color: 'mint', showNotes: false }, A.token), 'POST /groups (colour and mood only)')?.group;
  check(quiet?.color === 'mint' && quiet.showNotes === false && quiet.autoShare === false, 'a group keeps its colour and its mood-only setting');
  check(created.group.color === 'blue' && created.group.showNotes === true, 'a group made without them is blue and shows notes');
  await failsWith(request('POST', '/groups', { name: 'X', color: 'red' }, A.token), 422, 'VALIDATION_ERROR', 'unknown group colour');

  const C = await api.signIn(api.uniqueEmail('cara'));
  await request('PATCH', '/profile', { name: 'Cara' }, C.token);
  const looked = parses(S.previewResponse, await request('GET', `/groups/preview?code=${quiet.inviteCode.toLowerCase()}`, undefined, C.token), 'GET /groups/preview (lower-case code)')?.group;
  check(looked?.name === 'Quiet circle' && looked.isMember === false && looked.id === null && looked.memberCount === 1, 'a stranger sees what a code opens, but not the group id');
  await failsWith(request('GET', '/groups/preview?code=ZZZZZZ', undefined, C.token), 404, 'INVALID_INVITE_CODE', 'previewing a bad code');
  const seesOwn = parses(S.previewResponse, await request('GET', `/groups/preview?code=${quiet.inviteCode}`, undefined, A.token), 'GET /groups/preview (a member)')?.group;
  check(seesOwn?.isMember === true && seesOwn.id === quiet.id, 'a member gets the group id back, to open it');

  const inQuiet = parses(S.groupResponse, await request('POST', '/groups/join', { inviteCode: quiet.inviteCode, autoShare: true }, C.token), 'POST /groups/join (autoShare)')?.group;
  check(inQuiet?.autoShare === true, 'joining can switch sharing on');
  const emotional = parses(S.postMoodResponse, await request('POST', `/groups/${quiet.id}/moods`, { emotion: 'anger', note: 'my own words' }, A.token), 'POST .../moods (emotion)')?.mood;
  check(emotional?.emotion === 'anger' && emotional.level === 1, 'an emotion post keeps a level, for the vibe score');
  await failsWith(request('POST', `/groups/${quiet.id}/moods`, { note: 'no mood' }, B.token), 422, 'VALIDATION_ERROR', 'a post needs an emotion or a level');

  const entry = parses(S.entryResponse, await request('POST', '/entries', { emotion: 'joy', intensity: 3, note: 'private journal words' }, C.token), 'POST /entries (shared automatically)')?.entry;
  const quietFeed = parses(S.todayResponse, await request('GET', `/groups/${quiet.id}/moods/today`, undefined, C.token), 'GET .../moods/today (mood-only group)');
  const shared = quietFeed?.feed.find((f) => f.isOwn);
  check(shared?.emotion === 'joy' && shared.note === '', "the day's journal mood was shared, without the journal note");
  check(quietFeed?.feed.find((f) => !f.isOwn)?.note === '', "a mood-only group leaves out other people's notes");
  check(quietFeed?.feed.length === 2, 'the group feed has the post and the shared mood');
  // the journal endpoints the app uses, on the same entry
  parses(S.entriesResponse, await request('GET', `/entries?from=${entry.date}&to=${entry.date}`, undefined, C.token), 'GET /entries');
  const edited = parses(S.entryResponse, await request('PATCH', `/entries/${entry.id}`, { emotion: 'calm', intensity: 5 }, C.token), 'PATCH /entries/:id')?.entry;
  check(edited?.emotion === 'calm' && edited.intensity === 5, 'an entry can be edited');
  check((await request('GET', `/groups/${quiet.id}/moods/today`, undefined, C.token)).feed.find((f) => f.isOwn)?.emotion === 'calm', 'the shared mood follows the edit');
  const stats = parses(S.entryStatsResponse, await request('GET', `/entries/stats?date=${entry.date}`, undefined, C.token), 'GET /entries/stats')?.stats;
  check(stats?.total === 1 && stats.currentStreak === 1 && stats.topEmotion === 'calm', 'stats count the entry and its day');
  parses(S.deleteEntryResponse, await request('DELETE', `/entries/${entry.id}`, undefined, C.token), 'DELETE /entries/:id');
  check((await request('GET', `/groups/${quiet.id}/moods/today`, undefined, C.token)).feed.length === 1, 'deleting the journal entry takes the shared mood back');

  const overview = parses(S.overviewResponse, await request('GET', '/groups/overview', undefined, A.token), 'GET /groups/overview')?.groups;
  const quietOverview = overview?.find((x) => x.id === quiet.id);
  check(overview?.length === 2 && quietOverview?.members.length === 2 && quietOverview.today.length === 1, 'the overview lists each group with its members and the posts of today');

  // ── nudges ──
  parses(S.nudgeResponse, await request('POST', `/groups/${g.id}/nudge`, { targetUserId: A.user.id }, B.token), 'POST .../nudge');
  await failsWith(request('POST', `/groups/${g.id}/nudge`, { targetUserId: A.user.id }, B.token), 429, 'NUDGE_LIMIT', 'second nudge the same day');
  await failsWith(request('POST', `/groups/${g.id}/nudge`, { targetUserId: B.user.id }, B.token), 400, 'SELF_NUDGE', 'nudging yourself');
  await failsWith(request('POST', `/groups/${g.id}/nudge`, { targetUserId: uuid }, B.token), 404, 'TARGET_NOT_MEMBER', 'nudging a non-member');

  // ── streak ──
  const streak = parses(S.streakResponse, await request('GET', '/streaks/me', undefined, A.token), 'GET /streaks/me');
  check(streak?.streak.currentStreak === 1, 'first check-in starts a streak of 1');

  // ── password ──
  parses(S.setPasswordResponse, await request('POST', '/auth/password/set', { password: 'secret1' }, A.token), 'POST /auth/password/set');
  const login = parses(S.authResponse, await request('POST', '/auth/password/login', { email: emailA, password: 'secret1' }), 'POST /auth/password/login');
  check(login?.user.hasPassword === true, 'login payload says hasPassword');
  await failsWith(request('POST', '/auth/password/login', { email: emailA, password: 'wrong' }), 401, 'INVALID_CREDENTIALS', 'wrong password is a 401 that must NOT sign out');

  // ── auth + validation + membership errors ──
  await failsWith(request('GET', '/groups'), 401, 'UNAUTHORIZED', 'no token');
  await failsWith(request('GET', '/groups', undefined, 'garbage'), 401, 'UNAUTHORIZED', 'garbage token');
  await failsWith(request('POST', '/groups', { name: '' }, A.token), 422, 'VALIDATION_ERROR', 'empty group name');
  parses(S.messageResponse, await request('DELETE', `/groups/${g.id}/leave`, undefined, B.token), 'DELETE /groups/:id/leave');
  await failsWith(request('GET', `/groups/${g.id}`, undefined, B.token), 403, 'NOT_MEMBER', 'reading a group you left');
  await failsWith(request('GET', `/groups/${uuid}`, undefined, A.token), 404, 'GROUP_NOT_FOUND', 'unknown group');
  await failsWith(request('GET', '/groups/not-a-uuid', undefined, A.token), 422, 'VALIDATION_ERROR', 'malformed group id');
} catch (e) {
  check(false, `scenario aborted: ${e.message}`);
} finally {
  backend.stop();
}

for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.label}`);
failed = results.some((r) => !r.ok);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
console.log(`RESULT: ${failed ? 'FAIL' : 'PASS'}  (schemas in ${schemaDir})`);
process.exit(failed ? 1 : 0);
