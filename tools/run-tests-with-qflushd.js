import path from 'path';
import * as child_process from 'child_process';
import http from 'http';
import fs from 'fs';
import { createRequire } from 'module';

(async () => {
  try {
    // initialize token from QFLUSH_TEST_TOKEN if not set
    if (!process.env.QFLUSH_TOKEN && process.env.QFLUSH_TEST_TOKEN) {
      process.env.QFLUSH_TOKEN = process.env.QFLUSH_TEST_TOKEN;
      console.log('Initialized QFLUSH_TOKEN from QFLUSH_TEST_TOKEN');
    }

    const qflushdPath = path.join(process.cwd(), 'dist', 'daemon', 'qflushd.js');
    let serverModule;
    try {
      // Use createRequire to load CommonJS output even when this file runs as ESM
      const require = createRequire(import.meta.url);
      serverModule = require(qflushdPath);
    } catch (e) {
      console.error('Failed to require qflushd at', qflushdPath, e);
      process.exit(1);
    }

    const start = serverModule.startServer || (serverModule.default && serverModule.default.startServer);
    const stop = serverModule.stopServer || (serverModule.default && serverModule.default.stopServer);
    if (typeof start !== 'function') {
      console.error('startServer not found');
      process.exit(1);
    }

    // helper: simple sleep
    function sleep(ms) {
      return new Promise((res) => setTimeout(res, ms));
    }

    // wait for health endpoint with backoff
    async function waitForHealth(url, timeoutMs = 20000) {
      const deadline = Date.now() + timeoutMs;
      const delays = [100, 200, 400, 800, 1600, 3200];
      let attempt = 0;
      while (Date.now() < deadline) {
        try {
          const res = await new Promise((resolve, reject) => {
            const req = http.get(url, (r) => resolve(r));
            req.setTimeout(3000, () => {
              try { req.abort(); } catch {};
              reject(new Error('timeout'));
            });
            req.on('error', (err) => reject(err));
          });
          if (res && res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return true;
        } catch (e) {
          // ignore and retry
        }
        const delay = delays[Math.min(attempt, delays.length - 1)];
        await sleep(delay);
        attempt++;
      }
      throw new Error('health_timeout');
    }

    // ensure running qflushd has an expected token for tests
    process.env.QFLUSH_TOKEN = process.env.QFLUSH_TOKEN || process.env.QFLUSH_TEST_TOKEN || 'test-token';
    console.log('Starting qflushd...');
    try {
      await start(4500);
      console.log('qflushd started on 4500');
    } catch (e) {
      console.warn('startServer reported error, attempting to continue if server exists:', String(e));
    }

    // wait for the server to be reachable before launching tests
    try {
      await waitForHealth('http://127.0.0.1:4500/health', 20000);
      console.log('qflushd health check passed');
    } catch (e) {
      console.warn('qflushd health check failed or timed out, proceeding anyway:', String(e));
    }

    const vitestArgs = ['run', '--reporter', 'verbose', '--testTimeout', '60000'];
    const vitestBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest');

    if (!fs.existsSync(vitestBin)) {
      console.error('[QFLUSH] vitest binary not found at', vitestBin);
      console.error('[QFLUSH] Please ensure devDependencies are installed (npm ci) and vitest is available');
      try { if (typeof stop === 'function') await stop(); } catch (e) {}
      process.exit(1);
    }

    console.log('[QFLUSH] Running Vitest directly:', vitestBin);

    let runner;
    if (process.platform === 'win32') {
      // Explicitly invoke cmd.exe /c <vitest.cmd> args to avoid spawn EINVAL on Windows
      const cmd = 'cmd.exe';
      const cmdArgs = ['/c', vitestBin].concat(vitestArgs);
      runner = child_process.spawn(cmd, cmdArgs, { stdio: 'inherit' });
    } else {
      runner = child_process.spawn(vitestBin, vitestArgs, { stdio: 'inherit', shell: false });
    }

    runner.on('exit', async (code) => {
      console.log('vitest exited with', code, 'stopping qflushd...');
      try { if (typeof stop === 'function') await stop(); } catch (e) { console.error('stop failed', e); }
      process.exit(code ?? 0);
    });
    runner.on('error', (err) => { console.error('vitest spawn failed', err); try { if (typeof stop === 'function') stop(); } catch (_) {}; process.exit(1); });
  } catch (e) {
    console.error('run failed', e);
    process.exit(1);
  }
})();