// ROME-TAG: 0x2F0688

import * as http from 'http';
import { spawn } from 'child_process';
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

export async function runTests() {
  let serverMod: any = null;
  try {
    serverMod = await import('../daemon/qflushd.js');
    // start server programmatically on test port
    if (typeof serverMod.startServer === 'function') {
      serverMod.startServer(PORT);
    }
    // give it a moment to start
    await new Promise((r) => setTimeout(r, 400));

    const res = await fetch('http://localhost:4500/npz/rome-index');
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
  }
}
