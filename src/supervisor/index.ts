// ROME-TAG: 0xACAF19

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

type ProcRecord = {
  name: string;
  pid: number | null;
  cmd: string;
  args: string[];
  cwd?: string;
  log?: string;
  detached?: boolean;
};

type ManagedProc = {
  name: string;
  child: ChildProcess | null;
  info: ProcRecord;
  outStream?: WriteStream | null;
};

// Use canonical state dir '.qflush' (was '.qflush')
const STATE_DIR = join(process.cwd(), '.qflush');
const LOGS_DIR = join(STATE_DIR, 'logs');
const STATE_FILE = join(STATE_DIR, 'services.json');
let procs: Record<string, ProcRecord> = {};
const managed: Map<string, ManagedProc> = new Map();

function ensureStateDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
}

function persist() {
  try {
    ensureStateDir();
    writeFileSync(STATE_FILE, JSON.stringify(procs, null, 2), 'utf8');
  } catch (err) {
    logger.warn(`Failed to persist supervisor state: ${err}`);
  }
}

function load() {
  try {
    if (existsSync(STATE_FILE)) {
      const raw = readFileSync(STATE_FILE, 'utf8');
      procs = JSON.parse(raw);
    }
  } catch (err) {
    logger.warn(`Failed to load supervisor state: ${err}`);
  }
}

load();

export function listRunning() {
  return Object.values(procs);
}

function safeCloseStream(s?: WriteStream | null) {
  if (!s) return;
  try {
    s.end();
  } catch {}
}

function isAlive(mp?: ManagedProc): boolean {
  if (!mp || !mp.child || !mp.child.pid) return false;
  try {
    process.kill(mp.child.pid as number, 0);
    return true;
  } catch {
    return false;
  }
}

export function startProcess(name: string, cmd: string, args: string[] = [], opts: any = {}) {
  ensureStateDir();
  logger.info(`supervisor: starting ${name} -> ${cmd} ${args.join(' ')}`);

  const logFile = opts.logPath || join(LOGS_DIR, `${name}.log`);
  const outStream = createWriteStream(logFile, { flags: 'a' });

  const spawnOpts: any = { cwd: opts.cwd || process.cwd(), shell: true };

  // decide stdio based on detached/background
  spawnOpts.stdio = ['ignore', 'pipe', 'pipe'];
  if (opts.detached) spawnOpts.detached = true;

  // check existing managed proc
  const existing = managed.get(name);
  if (isAlive(existing)) {
    logger.info(`supervisor: ${name} is already running (pid=${existing!.child!.pid}), skipping start`);
    return existing!.child!;
  }

  // create a placeholder managed entry so subsequent calls see it
  managed.set(name, { name, child: null, info: { name, pid: null, cmd, args, cwd: opts.cwd, log: logFile, detached: !!spawnOpts.detached }, outStream });

  const child = spawn(cmd, args, spawnOpts);

  // attach streams
  if (child.stdout) child.stdout.pipe(outStream);
  if (child.stderr) child.stderr.pipe(outStream);

  child.on('error', (err) => logger.error(`supervisor: ${name} process error ${err.message}`));
  child.on('exit', (code) => {
    logger.warn(`supervisor: ${name} exited with ${code}`);
    const m = managed.get(name);
    if (m) {
      m.child = null;
      safeCloseStream(m.outStream);
      m.outStream = null;
    }
    if (procs[name]) delete procs[name];
    persist();
  });

  // if detached, allow process to continue after this parent exits
  if (spawnOpts.detached) {
    try { child.unref(); } catch {}
  }

  const record: ProcRecord = { name, pid: child.pid || null, cmd, args, cwd: opts.cwd, log: logFile, detached: !!spawnOpts.detached };
  procs[name] = record;
  // update managed entry with real child
  managed.set(name, { name, child, info: record, outStream });
  persist();
  return child;
}

export function stopProcess(name: string) {
  const entry = procs[name];
  const m = managed.get(name);
  if (!entry && !m) return false;
  try {
    if (entry && entry.pid) process.kill(entry.pid, 'SIGTERM');
    if (m && m.child) {
      try { m.child.kill('SIGTERM'); } catch {}
      m.child = null;
    }
    safeCloseStream(m?.outStream ?? null);
    if (procs[name]) delete procs[name];
    if (managed.has(name)) managed.delete(name);
    persist();
    return true;
  } catch (err) {
    logger.warn(`supervisor: failed to kill ${name} pid=${entry?.pid} (${err})`);
    return false;
  }
}

export function stopAll() {
  const names = Array.from(managed.keys());
  for (const n of names) {
    stopProcess(n);
  }
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {}
}

export function clearState() {
  procs = {};
  for (const [, m] of managed) safeCloseStream(m.outStream);
  managed.clear();
  try { if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE); } catch {}
}

export function freezeAll(reason?: string) {
  logger.warn(`supervisor: initiating emergency freeze${reason ? ` - ${reason}` : ''}`);
  for (const [name, m] of managed) {
    if (!m) continue;
    try {
      if (m.child && m.child.pid) {
        if (process.platform === 'win32') {
          // Windows: SIGSTOP not supported; try graceful termination
          try { m.child.kill('SIGTERM'); logger.warn(`supervisor: ${name} signalled SIGTERM (win32)`); } catch (e) {}
        } else {
          try { process.kill(m.child.pid as number, 'SIGSTOP'); logger.warn(`supervisor: ${name} signalled SIGSTOP`); } catch (e) {
            try { m.child.kill('SIGTERM'); } catch {}
          }
        }
      }
    } catch (err) {
      logger.warn(`supervisor: failed to freeze ${name} (${err})`);
    }
    // close streams
    safeCloseStream(m.outStream);
    m.outStream = null;
    // persist minimal state
    if (procs[name]) procs[name].pid = m.child && m.child.pid ? m.child.pid : null;
  }
  persist();
  logger.warn('supervisor: emergency freeze complete');
}

export default {
  startProcess,
  stopProcess,
  stopAll,
  clearState,
  listRunning,
  freezeAll,
};

