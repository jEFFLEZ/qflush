(async () => {
  try {
    const path = require('path');
    const child_process = require('child_process');
    const http = require('http');

    // initialize token from QFLUSH_TEST_TOKEN if not set
    if (!process.env.QFLUSH_TOKEN && process.env.QFLUSH_TEST_TOKEN) {
      process.env.QFLUSH_TOKEN = process.env.QFLUSH_TEST_TOKEN;
      console.log('Initialized QFLUSH_TOKEN from QFLUSH_TEST_TOKEN');
    }

    const qflushdPath = path.join(process.cwd(), 'dist', 'daemon', 'qflushd.js');
    let serverModule;
    try {
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
              req.abort();
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

    const vitestArgs = ['vitest', 'run', '--reporter', 'verbose', '--testTimeout', '60000'];
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    let runner;
    try {
      // attempt spawn without shell
      runner = child_process.spawn(npxCmd, vitestArgs, { stdio: 'inherit' });
    } catch (spawnErr) {
      console.warn('spawn failed, falling back to shell exec:', String(spawnErr));
      try {
        // fallback to shell execSync which is more tolerant on Windows in some environments
        const cmd = `${process.platform === 'win32' ? 'npx' : 'npx'} ${vitestArgs.map(a => String(a)).join(' ')}`;
        child_process.execSync(cmd, { stdio: 'inherit', shell: true });
        // execSync will block until finished; stop server and exit normally
        try { if (typeof stop === 'function') await stop(); } catch (e) { console.error('stop failed', e); }
        process.exit(0);
      } catch (execErr) {
        console.error('fallback exec failed', execErr);
        process.exit(1);
      }
    }

    if (runner) {
      runner.on('exit', async (code) => {
        console.log('vitest exited with', code, 'stopping qflushd...');
        try { if (typeof stop === 'function') await stop(); } catch (e) { console.error('stop failed', e); }
        process.exit(code ?? 0);
      });
      runner.on('error', (err) => { console.error('vitest spawn failed', err); process.exit(1); });
    }
  } catch (e) {
    console.error('run failed', e);
    process.exit(1);
  }
})();