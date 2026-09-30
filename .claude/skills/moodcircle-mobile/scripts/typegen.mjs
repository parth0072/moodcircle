#!/usr/bin/env node
// Generate the git-ignored files `tsc` needs on a fresh checkout:
//   expo-env.d.ts and .expo/types/router.d.ts (typed routes).
// Only the Metro dev server writes them (`expo export` does not), so start it,
// wait for both files, then stop it. POSIX only (uses a process group).
//
// Run it with --force after adding or removing routes: the typed-route file is only rewritten
// by the dev server, so `tsc` sees stale routes until it is regenerated.
//
// Usage: node typegen.mjs [expoProjectDir=mobile] [timeoutSeconds=120] [--force]

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const force = process.argv.includes('--force');
const [dirArg, timeoutArg] = process.argv.slice(2).filter((a) => a !== '--force');
const dir = resolve(dirArg ?? 'mobile');
const timeoutMs = Number(timeoutArg ?? 120) * 1000;
const targets = [join(dir, 'expo-env.d.ts'), join(dir, '.expo/types/router.d.ts')];

if (!existsSync(join(dir, 'package.json'))) {
  console.error(`typegen: no package.json in ${dir}`);
  process.exit(2);
}
if (force) {
  for (const t of targets) rmSync(t, { force: true });
} else if (targets.every(existsSync)) {
  console.log('typegen: already generated (use --force after adding or removing routes)');
  process.exit(0);
}

const freePort = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

const port = await freePort();
const child = spawn('npx', ['expo', 'start', '--port', String(port)], {
  cwd: dir,
  // EXPO_OFFLINE: api.expo.dev is unreachable in the sandbox and would stall startup.
  env: { ...process.env, CI: '1', EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1' },
  detached: true,
  stdio: 'ignore',
});

const stop = () => {
  try {
    process.kill(-child.pid, 'SIGTERM'); // whole group: npx -> node -> metro
  } catch {}
};
process.on('exit', stop);
process.on('SIGINT', () => process.exit(130));

const started = Date.now();
while (!targets.every(existsSync)) {
  if (Date.now() - started > timeoutMs) {
    stop();
    console.error(`typegen: timed out after ${timeoutMs / 1000}s; missing:`);
    for (const t of targets.filter((t) => !existsSync(t))) console.error(`  ${t}`);
    process.exit(1);
  }
  await sleep(500);
}
await sleep(500); // let the router types finish writing before we kill the server
stop();
console.log(`typegen: generated in ${((Date.now() - started) / 1000).toFixed(1)}s`);
