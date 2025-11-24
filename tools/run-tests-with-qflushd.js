(async () => {
  try {
    const path = require('path');
    const child_process = require('child_process');

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

    console.log('Starting qflushd...');
    try {
      await start(4500);
      console.log('qflushd started on 4500');
    } catch (e) {
      console.warn('startServer reported error, attempting to continue if server exists:', String(e));
    }

    const vitestArgs = ['vitest', 'run', '--reporter', 'verbose', '--testTimeout', '60000'];
    const runner = child_process.spawn('npx', vitestArgs, { stdio: 'inherit', shell: true });
    runner.on('exit', async (code) => {
      console.log('vitest exited with', code, 'stopping qflushd...');
      try { if (typeof stop === 'function') await stop(); } catch (e) { console.error('stop failed', e); }
      process.exit(code ?? 0);
    });
    runner.on('error', (err) => { console.error('vitest spawn failed', err); process.exit(1); });
  } catch (e) {
    console.error('run failed', e);
    process.exit(1);
  }
})();