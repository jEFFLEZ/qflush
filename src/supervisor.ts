import { spawn, ChildProcess } from 'child_process';

type StartOptions = { cwd?: string; detached?: boolean; logPath?: string };

type ProcInfo = { proc: ChildProcess | null; cmd?: string; pid?: number };

const running: Map<string, ProcInfo> = new Map();

export function startProcess(name: string, cmd: string, args: string[] = [], opts: StartOptions = {}) {
  try {
    const proc = spawn(cmd, args, { cwd: opts.cwd || process.cwd(), detached: !!opts.detached, stdio: 'ignore' });
    if (opts.detached && proc && typeof (proc as any).unref === 'function') (proc as any).unref();
    const info: ProcInfo = { proc, cmd, pid: proc && typeof (proc.pid) === 'number' ? proc.pid : undefined };
    running.set(name, info);
    return proc;
  } catch (e) {
    console.warn('supervisor.startProcess failed', e);
    running.set(name, { proc: null, cmd });
    return null;
  }
}

export async function stopProcess(name: string) {
  const info = running.get(name);
  if (!info || !info.proc) return false;
  try {
    info.proc.kill();
  } catch (e) {}
  running.delete(name);
  return true;
}

export function stopAll() {
  for (const [name, info] of running) {
    try {
      if (info && info.proc) info.proc.kill();
    } catch (e) {}
  }
  running.clear();
}

export function clearState() {
  running.clear();
}

export function listRunning() {
  const res: { name: string; pid?: number; cmd?: string }[] = [];
  for (const [name, info] of running) res.push({ name, pid: info && info.pid, cmd: info && info.cmd });
  return res;
}
