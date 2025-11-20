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
    // prefer non-blocking end with callback
    try {
      s.end(() => {});
    } catch {
      // fallback to destroy if end fails
      try { (s as any).destroy && (s as any).destroy(); } catch {}
    }
  } catch {}
}

// Helper: suspend/resume utilities and health-polling for auto-resume
function suspendProcessPid(pid: number): boolean {
  if (process.platform === 'win32') {
    try {
      const { spawn } = require('child_process');
      const pssuspendPath = process.env.QFLUSH_PSSUSPEND_PATH || 'pssuspend';
      const p = spawn(pssuspendPath, [String(pid)], { stdio: 'ignore', windowsHide: true });
      p.on('error', () => {});
      return true;
    } catch (e) {
      try { require('child_process').spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch (ee) {}
      return false;
    }
  } else {
    try {
      process.kill(pid, 'SIGSTOP');
      return true;
    } catch (e) {
      try { process.kill(pid, 'SIGTERM'); } catch (ee) {}
      return false;
    }
  }
}

function resumeProcessPid(pid: number): boolean {
  if (process.platform === 'win32') {
    try {
      const { spawn } = require('child_process');
      const pssuspendPath = process.env.QFLUSH_PSSUSPEND_PATH || 'pssuspend';
      // pssuspend -r <pid> resumes
      const p = spawn(pssuspendPath, ['-r', String(pid)], { stdio: 'ignore', windowsHide: true });
      p.on('error', () => {});
      return true;
    } catch (e) {
      try { require('child_process').spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch (ee) {}
      return false;
    }
  } else {
    try {
      process.kill(pid, 'SIGCONT');
      return true;
    } catch (e) {
      return false;
    }
  }
}

function pollUrlUntilHealthy(url: string, intervalMs = 3000, timeoutMs = 300000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      try {
        const u = new URL(url);
        const mod = (u.protocol === 'https:' ? require('https') : require('http'));
        const req = mod.request(url, { method: 'GET', timeout: 5000 }, (res: any) => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          res.resume();
          if (ok) return resolve(true);
          if (Date.now() - start > timeoutMs) return resolve(false);
          setTimeout(check, intervalMs);
        });
        req.on('error', () => {
          if (Date.now() - start > timeoutMs) return resolve(false);
          setTimeout(check, intervalMs);
        });
        req.on('timeout', () => { req.abort(); });
        req.end();
      } catch (e) {
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
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

export function freezeAll(reason?: string, opts?: { autoResume?: boolean; resumeCheck?: { url?: string; intervalMs?: number; timeoutMs?: number } }) {
  logger.warn(`supervisor: initiating emergency freeze${reason ? ` - ${reason}` : ''}`);
  const suspendedPids: number[] = [];
  for (const [name, m] of managed) {
    if (!m) continue;
    try {
      if (m.child && m.child.pid) {
        const pid = m.child.pid as number;
        let suspended = false;
        if (process.platform === 'win32') {
          // try suspend
          suspended = suspendProcessPid(pid);
          if (!suspended) {
            logger.warn(`supervisor: failed to suspend ${name} (pid=${pid}), attempted kill fallback`);
          }
        } else {
          // POSIX
          try {
            process.kill(pid as number, 'SIGSTOP');
            suspended = true;
            logger.warn(`supervisor: ${name} signalled SIGSTOP`);
          } catch (e) {
            try { process.kill(pid as number, 'SIGTERM'); logger.warn(`supervisor: ${name} signalled SIGTERM (fallback)`); } catch (ee) {}
          }
        }
        if (suspended) suspendedPids.push(pid);
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

  // auto-resume logic
  if (opts && opts.autoResume && opts.resumeCheck && opts.resumeCheck.url) {
    const intervalMs = opts.resumeCheck.intervalMs || 3000;
    const timeoutMs = opts.resumeCheck.timeoutMs || 5 * 60 * 1000;
    logger.info(`supervisor: auto-resume enabled, polling ${opts.resumeCheck.url} every ${intervalMs}ms up to ${timeoutMs}ms`);
    (async () => {
      const ok = await pollUrlUntilHealthy(opts.resumeCheck.url!, intervalMs, timeoutMs);
      if (ok) {
        logger.info('supervisor: resume-check OK, resuming suspended processes');
        for (const pid of suspendedPids) {
          try {
            const res = resumeProcessPid(pid);
            logger.info(`supervisor: resume pid=${pid} result=${res}`);
          } catch (e) {
            logger.warn(`supervisor: failed to resume pid=${pid} (${e})`);
          }
        }
      } else {
        logger.warn('supervisor: auto-resume timeout reached, leaving processes suspended');
      }
    })();
  }

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


