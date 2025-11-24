// vitest.setup.ts — Test bootstrap for Vitest
// Ensures runtime environment and guards used by legacy tests.

import * as fs from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Prevent tests from terminating the process when some legacy test files call process.exit()
// Make it a no-op and log a warning instead so the test runner can continue.
const originalExit = process.exit;
(process as any).exit = function (code?: number) {
  try {
    // keep it visible in test logs
    // eslint-disable-next-line no-console
    console.warn('[vitest.setup] intercepted process.exit(', code, ')');
  } catch (_) {}
  // no-op
  return undefined as any;
};
// restore hook if needed
process.on('exit', (code) => {
  // noop
});

// Force cortex mode for tests to avoid requiring HTTP daemon and ports
process.env.QFLUSH_MODE = 'cortex';

// Ensure .qflush/logs and spyder.log exist in each test working directory
function ensureLogsForCwd(cwd: string) {
  try {
    const root = cwd || process.cwd();
    const logs = path.join(root, '.qflush', 'logs');
    mkdirSync(logs, { recursive: true });
    // open file in append mode so we never truncate existing logs during tests
    writeFileSync(path.join(logs, 'spyder.log'), '', { flag: 'a' });
  } catch (e) {
    // swallow any errors to avoid interfering with tests
    // eslint-disable-next-line no-console
    console.warn('[vitest.setup] could not ensure .qflush/logs:', String(e));
  }
}

// Ensure for initial cwd
ensureLogsForCwd(process.cwd());

// Patch process.chdir so tests that change cwd get logs created
try {
  const origChdir = process.chdir;
  (process as any).chdir = function (dir: string) {
    const ret = origChdir.apply(process, arguments as any);
    try { ensureLogsForCwd(process.cwd()); } catch (e) {}
    return ret;
  };
} catch (_) {}

// Keep setup minimal — filesystem write interception removed.
// The daemon and core code now use safe write helpers so tests should no longer see ENOENT.

// Start the compiled qflush daemon during tests when VITEST env var is set and mode allows it
if (process.env.VITEST) {
  try {
    // default port used in CI/tests
    const port = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 43421;
    // ensure Redis disabled in test env unless explicitly enabled
    if (!process.env.QFLUSH_ENABLE_REDIS) process.env.QFLUSH_ENABLE_REDIS = '0';

    // In cortex mode we prefer the PNG bus; only start the daemon if explicitly required by tests
    if (process.env.QFLUSH_MODE !== 'cortex') {
      // Use dynamic require to preserve compatibility
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const daemon = require('./dist/daemon/qflushd');
      if (daemon && typeof daemon.startServer === 'function') {
        try {
          daemon.startServer(port);
          // eslint-disable-next-line no-console
          console.warn('[vitest.setup] started qflush daemon on port', port);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[vitest.setup] failed to start daemon:', String(e));
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('[vitest.setup] compiled daemon does not export startServer (./dist/daemon/qflushd)');
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('[vitest.setup] running tests in CORTEX mode (no HTTP daemon)');
    }
  } catch (e) {
    // if dist file is missing or require fails, log for CI visibility; tests may still mock network calls
    // eslint-disable-next-line no-console
    console.warn('[vitest.setup] could not require compiled daemon:', String(e));
  }
}
