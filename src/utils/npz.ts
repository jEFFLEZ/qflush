import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import logger from './logger';

export type ResolveResult = { gate: 'green' | 'yellow' | 'dlx' | 'fail'; cmd?: string; args?: string[]; cwd?: string };

function isWindows() {
  return process.platform === 'win32';
}

function findLocalBin(moduleName: string, cwd: string): string | null {
  // try node_modules/.bin/<name> or <pkg>/bin
  const localBin = path.join(cwd, 'node_modules', '.bin', moduleName + (isWindows() ? '.cmd' : ''));
  if (existsSync(localBin)) return localBin;
  // try package bin entry via require.resolve
  try {
    const pkgPath = require.resolve(moduleName, { paths: [cwd] });
    return pkgPath;
  } catch {
    return null;
  }
}

function resolveViaModuleGate(pkgName: string): { cmd: string; args: string[]; cwd?: string } | null {
  try {
    const pkgPath = require.resolve(pkgName);
    // run via node <pkgPath>
    return { cmd: process.execPath, args: [pkgPath], cwd: path.dirname(pkgPath) };
  } catch {
    return null;
  }
}

export function npzResolve(nameOrPkg: string, opts: { cwd?: string } = {}): ResolveResult {
  const cwd = opts.cwd || process.cwd();

  // Gate 1: GREEN - local bin
  const local = findLocalBin(nameOrPkg, cwd);
  if (local) {
    logger.nez('NPZ:JOKER', `${nameOrPkg} -> ${local}`);
    return { gate: 'green', cmd: local, args: [], cwd };
  }

  // Gate 2: YELLOW - module resolution
  const mod = resolveViaModuleGate(nameOrPkg);
  if (mod) {
    logger.nez('NPZ:JOKER', `${nameOrPkg} -> ${mod.cmd} ${mod.args.join(' ')}`);
    return { gate: 'yellow', cmd: mod.cmd, args: mod.args, cwd: mod.cwd };
  }

  // Gate 3: DLX - use npx as fallback
  try {
    logger.joker('NPZ:JOKER', `${nameOrPkg} -> npx`);
    return { gate: 'dlx', cmd: 'npx', args: [nameOrPkg], cwd };
  } catch (err) {
    logger.warn(`[NPZ:JOKER][FAIL] ${nameOrPkg} cannot be resolved`);
    return { gate: 'fail' };
  }
}

export function runResolved(res: ResolveResult): { ok: boolean; status?: number } {
  if (!res.cmd) return { ok: false };
  const args = res.args || [];
  logger.nez('NPZ:JOKER', `running ${res.cmd} ${args.join(' ')}`);
  try {
    const r = spawnSync(res.cmd, args, { stdio: 'inherit', cwd: res.cwd || process.cwd(), shell: false });
    return { ok: r.status === 0, status: r.status ?? undefined };
  } catch (err) {
    logger.error(`[NPZ:JOKER] failed to run ${err}`);
    return { ok: false };
  }
}

export default { npzResolve, runResolved };
