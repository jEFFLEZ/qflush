// ROME-TAG: 0xBBFCDC

import fetch from '../utils/fetch';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

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

async function waitForServerReady(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${DAEMON_URL()}/npz/rome-index`);
      if (res && (res.status === 200 || res.status === 404 || res.status === 204)) return true;
    } catch (e) {
      // ignore and retry
    }
    await wait(200);
  }
  return false;
}

async function startDaemon() {
  // build first
  await new Promise<void>((resolve, reject) => {
    const t = spawn(process.execPath, [path.join(process.cwd(), 'node_modules', 'typescript', 'lib', 'tsc.js'), '-p', '.']);
    t.on('close', (code) => code === 0 ? resolve() : reject(new Error('tsc failed')));
  });

  DAEMON_PORT = await getFreePort();

  daemonProc = spawn(process.execPath, [path.join(process.cwd(), 'dist', 'daemon', 'qflushd.js')], { env: { ...process.env, QFLUSHD_PORT: String(DAEMON_PORT) }, stdio: 'inherit' });
  // wait for server to be ready (with timeout)
  const ready = await waitForServerReady(8000);
  if (!ready) {
    // give one last short delay then throw so caller can report proper error
    await wait(200);
    throw new Error('daemon did not start in time');
  }
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
