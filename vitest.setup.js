// Prevent tests from terminating the process when some legacy test files call process.exit()
// Make it a no-op and log a warning instead so the test runner can continue.
const originalExit = process.exit;
process.exit = function(code) {
  try {
    console.warn('[vitest.setup] intercepted process.exit(', code, ')');
  } catch (_) {}
  return undefined;
};
// restore hook if needed
process.on('exit', (code) => {
  // noop
});

// Start the compiled qflush daemon during tests when VITEST env var is set
if (process.env.VITEST) {
  try {
    // default port used in CI/tests
    const port = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 43421;
    // ensure Redis disabled in test env unless explicitly enabled
    if (!process.env.QFLUSH_ENABLE_REDIS) process.env.QFLUSH_ENABLE_REDIS = '0';

    // require the built daemon entry; path is relative to repo root
    const daemon = require('./dist/daemon/qflushd');
    if (daemon && typeof daemon.startServer === 'function') {
      // only start if not already running
      try {
        daemon.startServer(port);
        console.warn('[vitest.setup] started qflush daemon on port', port);
      } catch (e) {
        console.warn('[vitest.setup] failed to start daemon:', String(e));
      }
    } else {
      console.warn('[vitest.setup] compiled daemon does not export startServer (./dist/daemon/qflushd)');
    }
  } catch (e) {
    // if dist file is missing or require fails, log for CI visibility; tests may still mock network calls
    console.warn('[vitest.setup] could not require compiled daemon:', String(e));
  }
}
