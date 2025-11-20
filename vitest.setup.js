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
