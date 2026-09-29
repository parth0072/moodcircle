#!/usr/bin/env node
// Prove a mobile slice works end to end without a phone or simulator:
//   1. start the real MoodCircle backend on a free port with a throwaway SQLite DB,
//   2. `expo export --platform web` with EXPO_PUBLIC_API_URL=/api,
//   3. serve dist/ and proxy /api to the backend on ONE origin (the backend has no
//      CORS, and a same-origin proxy keeps the browser from needing it),
//   4. drive the app in headless Chromium at phone size, run your flow(s), screenshot,
//      and collect console errors / failed API calls.
//
// This exercises react-native-web, not the real iOS renderer. Report it as a web-export
// check, never as "tested on iOS".
//
// Usage:
//   node verify-web.mjs [--project mobile] [--flow path/to/flow.mjs]... [--out dir]
//                       [--viewport 390x844] [--skip-build] [--ignore regex]...
//
// A flow is an ES module: `export default async ({ page, baseUrl, shot, expect, waitForText,
// pageText, allow, api }) => {}` (see flows/smoke.mjs and flows/auth-gate.example.mjs).
// With no --flow, flows/smoke.mjs runs.

import { spawn, execSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { makeApi, startBackend } from './lib/backend.mjs';

const { values: args } = parseArgs({
  options: {
    project: { type: 'string', default: 'mobile' },
    flow: { type: 'string', multiple: true },
    out: { type: 'string' },
    viewport: { type: 'string', default: '390x844' },
    'skip-build': { type: 'boolean', default: false },
    ignore: { type: 'string', multiple: true },
  },
});

const here = import.meta.dirname;
const project = resolve(args.project);
const dist = join(project, 'dist');
const [vw, vh] = args.viewport.split('x').map(Number);
const flows = args.flow?.length ? args.flow.map((f) => resolve(f)) : [join(here, 'flows/smoke.mjs')];
const ignore = (args.ignore ?? []).map((r) => new RegExp(r));
const outDir = resolve(args.out ?? join(tmpdir(), 'mc-verify-shots'));
mkdirSync(outDir, { recursive: true });

const log = (msg) => console.log(msg);
const cleanups = [];
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    return require(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'));
  }
}

function run(cmd, cmdArgs, opts) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, cmdArgs, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', fail);
    p.on('close', (code) => (code === 0 ? ok(out) : fail(new Error(`${cmd} ${cmdArgs.join(' ')} exited ${code}\n${out.slice(-2500)}`))));
  });
}

// ── 2. web export ────────────────────────────────────────────────────────────
async function buildWeb() {
  const t = Date.now();
  await run('npx', ['expo', 'export', '--platform', 'web'], {
    cwd: project,
    env: {
      ...process.env,
      CI: '1',
      EXPO_OFFLINE: '1', // api.expo.dev is unreachable in the sandbox
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_API_URL: '/api', // web only: native builds need an absolute URL
    },
  });
  return ((Date.now() - t) / 1000).toFixed(1);
}

// ── 3. one origin: static dist/ + /api proxy ─────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
};

async function startWebServer(backendPort) {
  const distPrefix = resolve(dist) + sep;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      const up = http.request({ host: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers: req.headers }, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      });
      up.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
      req.pipe(up);
      return;
    }
    const base = resolve(join(dist, decodeURIComponent(url.pathname)));
    if (!(base + sep).startsWith(distPrefix)) { res.writeHead(403); res.end(); return; }
    const hit = [base, `${base}.html`, join(base, 'index.html')].find((f) => existsSync(f) && statSync(f).isFile());
    // Unknown extension-less paths fall back to index.html: the client router owns them.
    // Unknown asset paths (has an extension) are real 404s.
    const file = hit ?? (extname(base) ? null : join(dist, 'index.html'));
    if (!file || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  cleanups.push(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

// ── main ─────────────────────────────────────────────────────────────────────
let failed = false;
try {
  if (!existsSync(join(project, 'package.json'))) throw new Error(`no Expo project at ${project} (use --project)`);

  const backend = await startBackend();
  cleanups.push(backend.stop);
  const backendPort = backend.port;
  log(`✓ backend on :${backendPort} (throwaway DB, real routes)`);

  if (args['skip-build'] && existsSync(dist)) log('• reusing existing dist/ (--skip-build)');
  else log(`✓ expo export --platform web (${await buildWeb()}s)`);

  const baseUrl = await startWebServer(backendPort);
  log(`✓ serving dist/ + /api proxy at ${baseUrl}`);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  cleanups.push(() => browser.close());
  const api = makeApi(baseUrl);

  for (const file of flows) {
    const mod = await import(pathToFileURL(file).href);
    const flowName = mod.name ?? file.split(sep).pop().replace(/\.mjs$/, '');
    const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    const problems = [];
    const allowed = [...ignore];
    // A flow that provokes errors on purpose (bad password, aborted request) declares them here.
    const allow = (pattern) => { allowed.push(pattern instanceof RegExp ? pattern : new RegExp(pattern)); };
    const note = (kind, text) => { if (!allowed.some((r) => r.test(text))) problems.push(`${kind}: ${text}`); };
    page.on('pageerror', (e) => note('pageerror', e.message));
    page.on('console', (m) => m.type() === 'error' && note('console.error', m.text()));
    page.on('requestfailed', (r) => note('requestfailed', `${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => r.url().includes('/api/') && r.status() >= 500 && note('api5xx', `${r.status()} ${r.url()}`));

    const checks = [];
    const shots = [];
    const expect = (cond, label) => { checks.push({ ok: !!cond, label }); };
    const pageText = async () => (((await page.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ').trim());
    // Wait until the page shows `needle`, and record the outcome as a check (never throws).
    const waitForText = async (needle, label = `sees "${needle}"`, timeout = 8000) => {
      try {
        await page.waitForFunction((n) => document.body.innerText.includes(n), needle, { timeout });
        checks.push({ ok: true, label });
        return true;
      } catch {
        checks.push({ ok: false, label: `${label} (page said: ${(await pageText()).slice(0, 100)})` });
        return false;
      }
    };
    const shot = async (name) => {
      const path = join(outDir, `${flowName}-${name}.png`);
      await page.screenshot({ path });
      shots.push(path);
    };

    log(`\nflow ${flowName}:`);
    try {
      await mod.default({ page, baseUrl, shot, expect, waitForText, pageText, allow, api });
    } catch (e) {
      checks.push({ ok: false, label: `flow threw: ${e.message.split('\n')[0]}` });
      await shot('failure').catch(() => {});
    }
    for (const c of checks) log(`  ${c.ok ? '✓' : '✗'} ${c.label}`);
    for (const s of shots) log(`  📷 ${s}`);
    log(problems.length ? `  problems (${problems.length}):\n${problems.map((p) => `    - ${p}`).join('\n')}` : '  problems: none');
    if (problems.length || checks.some((c) => !c.ok)) failed = true;
    await context.close();
  }
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  failed = true;
} finally {
  for (const fn of cleanups.reverse()) {
    try { await fn(); } catch {}
  }
}
log(`\nRESULT: ${failed ? 'FAIL' : 'PASS'}  (react-native-web in Chromium, not iOS)`);
process.exit(failed ? 1 : 0);
