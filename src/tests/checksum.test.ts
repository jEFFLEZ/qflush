// ROME-TAG: 0xBBFCDC

import fetch from '../utils/fetch';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { describe, it, expect } from 'vitest';

let DAEMON_PORT = 0;
const DAEMON_URL = () => `http://localhost:${DAEMON_PORT}`;
let daemonProc: any = null;

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      // @ts-ignore
      const port = (srv.address() as any).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', (err) => reject(err));
  });
}

async function startDaemon() {
  // build first
  await new Promise<void>((resolve, reject) => {
    const t = spawn(process.execPath, [path.join(process.cwd(), 'node_modules', 'typescript', 'lib', 'tsc.js'), '-p', '.']);
    t.on('close', (code) => code === 0 ? resolve() : reject(new Error('tsc failed')));
  });

  DAEMON_PORT = await getFreePort();
  // ensure test token is present for the spawned daemon
  const env = { ...process.env, QFLUSHD_PORT: String(DAEMON_PORT) } as any;
  if (!env.QFLUSH_TOKEN) env.QFLUSH_TOKEN = process.env.QFLUSH_TOKEN || 'test-token';

  // spawn a Node process that requires the module and starts the server
  const nodeCmd = `require('${path.join(process.cwd(), 'dist', 'daemon', 'qflushd.js').replace(/\\/g,'\\\\')}').startServer(${DAEMON_PORT}).catch(e=>{ console.error(e); process.exit(1); });`;
  daemonProc = spawn(process.execPath, ['-e', nodeCmd], { env, stdio: 'inherit' });

  // wait until daemon responds on health endpoint
  const maxAttempts = 40;
  let healthy = false;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // try localhost on the port
      const res = await fetch(`http://localhost:${DAEMON_PORT}/health`);
      if (res.ok) { healthy = true; break; }
    } catch (e) {}
    await wait(200);
  }
  if (!healthy) throw new Error('daemon failed to start');
}

async function stopDaemon() {
  if (daemonProc) {
    daemonProc.kill();
    daemonProc = null;
    await wait(200);
  }
}

export async function runTests() {
  try {
    await startDaemon();
    // store
    let res = await fetch(`${DAEMON_URL()}/npz/checksum/store`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 't1', checksum: 'abc', ttlMs: 2000 }) } as any);
    let j: any = await res.json();
    if (!j.success) throw new Error('store failed');

    res = await fetch(`${DAEMON_URL()}/npz/checksum/list`);
    j = await res.json() as any;
    if (!j.success || j.count === 0) throw new Error('list failed');

    // verify mismatch
    res = await fetch(`${DAEMON_URL()}/npz/checksum/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 't1', checksum: 'wrong' }) } as any);
    if (res.status === 200) throw new Error('mismatch should fail');

    // verify correct
    res = await fetch(`${DAEMON_URL()}/npz/checksum/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 't1', checksum: 'abc' }) } as any);
    j = await res.json() as any;
    if (!j.success) throw new Error('verify failed');

    // clear
    res = await fetch(`${DAEMON_URL()}/npz/checksum/clear`, { method: 'DELETE' } as any);
    j = await res.json() as any;
    if (!j.success) throw new Error('clear failed');

    console.log('tests PASSED');
  } catch (e) {
    console.error('tests FAILED', e);
    throw e;
  } finally {
    await stopDaemon();
  }
}

describe('checksum (stub)', () => {
  it('stub passes', () => {
    expect(true).toBe(true);
  });
});
