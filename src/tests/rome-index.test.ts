import * as http from 'http';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

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

// This test starts the qflush daemon (dist) and queries /npz/rome-index
(async () => {
  // attempt to start local server by importing qflushd if possible
  try {
    // require the compiled daemon from dist if exists
    const server = await import('../daemon/qflushd.js');
    // give it a moment to start
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch('http://localhost:4500/npz/rome-index');
    const j: any = await res.json();
    console.log('rome-index test response:', j && j.count);
    process.exit(0);
  } catch (e) {
    console.error('failed to run daemon to test index', e);
    process.exit(2);
  }
})();

(async () => {
  try {
    const all: any = await waitForJson('/npz/rome-index', 40, 200);
    if (!all || !Array.isArray(all.items)) {
      console.error('invalid index response', all);
      process.exit(2);
    }
    console.log('rome-index count=', all.count);

    // try filter by type 'daemon' (should return 0 or more)
    const byDaemon: any = await waitForJson('/npz/rome-index?type=daemon', 10, 200);
    if (!byDaemon || !Array.isArray(byDaemon.items)) {
      console.error('invalid filtered response', byDaemon);
      process.exit(2);
    }
    console.log('rome-index daemon count=', byDaemon.count);
    // pass
    process.exit(0);
  } catch (e) {
    console.error('rome-index test failed', String(e));
    process.exit(3);
  }
})();
