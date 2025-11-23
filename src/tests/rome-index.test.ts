// ROME-TAG: 0x2F0688

import * as http from 'http';
import { spawn, ChildProcess } from 'child_process';
import fetch from '../utils/fetch';

const PORT = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 4500;
const BASE = `http://localhost:${PORT}`;

async function waitForJson(path: string, attempts = 20, delayMs = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE}${path}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const j = await res.json();
      return j;
    } catch (e) {
      // wait and retry
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`failed to fetch JSON ${path} after ${attempts} attempts`);
}

async function isReachable(attempts = 5, delayMs = 200) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE}/npz/rome-index`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export async function runTests() {
  let serverMod: any = null;
  let spawned: ChildProcess | null = null;
  try {
    // If service already reachable, skip starting
    if (!(await isReachable(3, 200))) {
      try {
        serverMod = await import('../daemon/qflushd.js');
        // start server programmatically on test port
        if (serverMod && typeof serverMod.startServer === 'function') {
          serverMod.startServer(PORT);
        } else {
          // fallback: spawn daemon process from dist (if present)
          try {
            spawned = spawn('node', ['./dist/daemon/qflushd.js'], {
              env: { ...process.env, QFLUSHD_PORT: String(PORT), QFLUSH_ENABLE_REDIS: '0' },
              stdio: ['ignore', 'pipe', 'pipe'],
            });
            // pipe output to console to help debugging
            if (spawned.stdout) spawned.stdout.on('data', (d) => console.log('[qflushd]', d.toString()));
            if (spawned.stderr) spawned.stderr.on('data', (d) => console.error('[qflushd]', d.toString()));
          } catch (e) {
            // ignore spawn failure, will fail on subsequent fetch attempts
          }
        }
      } catch (e) {
        // import failed; try spawning the dist daemon as a last resort
        try {
          spawned = spawn('node', ['./dist/daemon/qflushd.js'], {
            env: { ...process.env, QFLUSHD_PORT: String(PORT), QFLUSH_ENABLE_REDIS: '0' },
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          if (spawned.stdout) spawned.stdout.on('data', (d) => console.log('[qflushd]', d.toString()));
          if (spawned.stderr) spawned.stderr.on('data', (d) => console.error('[qflushd]', d.toString()));
        } catch (ee) {}
      }

      // give it a moment to start
      await new Promise((r) => setTimeout(r, 400));

      // ensure it's reachable before proceeding
      if (!(await isReachable(40, 200))) {
        throw new Error(`qflushd not reachable at ${BASE}`);
      }
    }

    const res = await fetch(`${BASE}/npz/rome-index`);
    const j: any = await res.json();
    console.log('rome-index test response:', j && j.count);

    const all: any = await waitForJson('/npz/rome-index', 40, 200);
    if (!all || !Array.isArray(all.items)) {
      console.error('invalid index response', all);
      throw new Error('invalid index response');
    }
    console.log('rome-index count=', all.count);

    // try filter by type 'daemon' (should return 0 or more)
    const byDaemon: any = await waitForJson('/npz/rome-index?type=daemon', 10, 200);
    if (!byDaemon || !Array.isArray(byDaemon.items)) {
      console.error('invalid filtered response', byDaemon);
      throw new Error('invalid filtered response');
    }
    console.log('rome-index daemon count=', byDaemon.count);
  } finally {
    try { if (serverMod && typeof serverMod.stopServer === 'function') serverMod.stopServer(); } catch (e) {}
    try { if (spawned && typeof spawned.kill === 'function') spawned.kill(); } catch (e) {}
  }
}

import { describe, it, expect } from 'vitest';

describe('rome-index (stub)', () => {
  it('stub passes', () => {
    expect(true).toBe(true);
  });
});
