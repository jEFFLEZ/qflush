#!/usr/bin/env node
// Lightweight wrapper that calls the installed qflush but forces safe CI env
const { spawnSync } = require('child_process');
const path = require('path');

// Ensure safe env defaults
process.env.QFLUSH_DISABLE_SUPERVISOR = process.env.QFLUSH_DISABLE_SUPERVISOR || '1';
process.env.QFLUSH_MODE = process.env.QFLUSH_MODE || 'cortex';

// delegate to installed qflush (global or local)
const cmd = process.env.QFLUSH_CLI_PATH || 'qflush';
const args = process.argv.slice(2);
const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
process.exit(res.status || 0);
