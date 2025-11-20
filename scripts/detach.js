#!/usr/bin/env node
// Spawn the given command detached and unref it.
const { spawn } = require('child_process');
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/detach.js <command> [args...]');
  process.exit(1);
}
const cmd = args[0];
const cmdArgs = args.slice(1);
const child = spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' });
child.unref();
console.log(`detached pid=${child.pid}`);
