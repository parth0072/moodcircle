// Shared by verify-web.mjs and contract-check.mjs: a throwaway MoodCircle backend and a tiny
// client for seeding it. The real routes run against an empty temp SQLite file on a free port.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export const repoRoot = resolve(import.meta.dirname, '../../../../..'); // <repo>/.claude/skills/moodcircle-mobile/scripts/lib

export const freePort = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

/** Returns { port, stop }. Throws with the backend's output if it never becomes healthy. */
export async function startBackend() {
  const tmp = mkdtempSync(join(tmpdir(), 'mc-verify-'));
  const port = await freePort();
  const child = spawn('node', ['server.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: join(tmp, 'verify.db'),
      JWT_SECRET: 'verify-only-secret',
      NODE_ENV: 'development', // anything but production: OTP request returns the code
      // dotenv never overrides variables that are already set, so a real .env can't make the
      // throwaway backend send actual emails.
      SMTP_USER: '',
      SMTP_PASS: '',
      BASE_PATH: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  const stop = () => {
    child.kill('SIGTERM');
    rmSync(tmp, { recursive: true, force: true });
  };

  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) {
      stop();
      throw new Error(`backend exited early:\n${out.slice(-1500)}`);
    }
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return { port, stop };
    } catch {}
    await sleep(250);
  }
  stop();
  throw new Error(`backend did not become healthy:\n${out.slice(-1500)}`);
}

/**
 * Minimal client for seeding and probing. `request` returns the envelope's `data` and throws an
 * Error carrying `status` and `code` on `success: false`. `raw` returns { status, json } untouched.
 */
export function makeApi(baseUrl) {
  const raw = async (method, path, body, token) => {
    const r = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json() };
  };
  const request = async (method, path, body, token) => {
    const { status, json } = await raw(method, path, body, token);
    if (!json.success) throw Object.assign(new Error(`${method} ${path} -> ${status} ${json.code}: ${json.message}`), { status, code: json.code });
    return json.data;
  };
  return {
    raw,
    request,
    uniqueEmail: (prefix = 'user') => `${prefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`,
    // Seed an account without touching the UI. Relies on the dev-only `otp` in the response.
    async signIn(email) {
      const { otp } = await request('POST', '/auth/otp/request', { email });
      if (!otp) throw new Error('backend did not return otp; is NODE_ENV=production?');
      return request('POST', '/auth/otp/verify', { email, otp });
    },
  };
}
