// A real server on a free port with a throwaway database, for the end-to-end tests.
//   const api = await startServer({ PHOTO_MAX_BYTES: '2048' });  ...  api.stop();

const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const SECRET = 'test-only-secret';

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function startServer(extraEnv = {}) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'moodcircle-test-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}/api`;
  const server = spawn('node', ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: path.join(tmp, 'test.db'),
      JWT_SECRET: SECRET,
      NODE_ENV: 'development',
      BASE_PATH: '',
      SMTP_USER: '',
      SMTP_PASS: '',
      ...extraEnv,
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }

  async function call(method, url, { token, body } = {}) {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  }

  let counter = 0;
  // A new signed-in user (through the real OTP flow: the dev server echoes the code), optionally named.
  async function newUser(name) {
    counter += 1;
    const email = `user${counter}@example.com`;
    const requested = await call('POST', '/auth/otp/request', { body: { email } });
    const verified = await call('POST', '/auth/otp/verify', { body: { email, otp: requested.json.data.otp } });
    const { token, user } = verified.json.data;
    if (name) await call('PATCH', '/profile', { token, body: { name } });
    return { token, id: user.id, name };
  }

  return {
    base,
    secret: SECRET,
    call,
    newUser,
    stop() {
      server.kill();
      rmSync(tmp, { recursive: true, force: true });
    },
  };
}

module.exports = { startServer };
