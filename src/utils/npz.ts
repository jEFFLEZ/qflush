// ROME-TAG: 0x1553F0

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import logger from './logger.js';
import { SERVICE_MAP } from './paths.js';

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

  // Gate 0: if nameOrPkg matches a known SERVICE_MAP package, prefer local candidates in workspace
  try {
    for (const key of Object.keys(SERVICE_MAP)) {
      if (SERVICE_MAP[key].pkg === nameOrPkg) {
        const tries = SERVICE_MAP[key].candidates || [];
        for (const t of tries) {
          const candidatePath = path.join(cwd, t);
          try {
            if (!existsSync(candidatePath)) continue;
            // prefer dist entry if exists
            const distEntry = path.join(candidatePath, 'dist', 'index.js');
            if (existsSync(distEntry)) {
              logger.nez && logger.nez('NPZ:JOKER', `${nameOrPkg} -> local dist ${distEntry}`);
              return { gate: 'green', cmd: process.execPath, args: [distEntry], cwd: path.dirname(distEntry) };
            }
            // otherwise if package.json with start script exists, prefer npm --prefix <candidate> run start
            const pkgJsonPath = path.join(candidatePath, 'package.json');
            if (existsSync(pkgJsonPath)) {
              try {
                const pj = require(pkgJsonPath);
                if (pj && pj.scripts && pj.scripts.start) {
                  logger.nez && logger.nez('NPZ:JOKER', `${nameOrPkg} -> local start script at ${candidatePath}`);
                  return { gate: 'green', cmd: 'npm', args: ['--prefix', candidatePath, 'run', 'start'], cwd: candidatePath };
                }
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            // ignore candidate
          }
        }
        break;
      }
    }
  } catch (e) {
    // ignore
  }

  // Gate 1: GREEN - local bin
  const local = findLocalBin(nameOrPkg, cwd);
  if (local) {
    logger.nez && logger.nez('NPZ:JOKER', `${nameOrPkg} -> ${local}`);
    return { gate: 'green', cmd: local, args: [], cwd };
  }

  // Gate 2: YELLOW - module resolution
  const mod = resolveViaModuleGate(nameOrPkg);
  if (mod) {
    logger.nez && logger.nez('NPZ:JOKER', `${nameOrPkg} -> ${mod.cmd} ${mod.args.join(' ')}`);
    return { gate: 'yellow', cmd: mod.cmd, args: mod.args, cwd: mod.cwd };
  }

  // Gate 3: DLX - use npm exec as modern fallback, fallback to npx if needed
  try {
    // prefer `npm exec -- <pkg>` which is the modern replacement for npx (npm v7+)
    // This will allow running installed or remote packages consistently.
    logger.joker && logger.joker('NPZ:JOKER', `${nameOrPkg} -> npm exec`);
    return { gate: 'dlx', cmd: 'npm', args: ['exec', '--', nameOrPkg], cwd };
  } catch (err) {
    // last-resort: npx
    try {
      logger.joker && logger.joker('NPZ:JOKER', `${nameOrPkg} -> npx`);
      return { gate: 'dlx', cmd: 'npx', args: [nameOrPkg], cwd };
    } catch (e) {
      logger.warn && logger.warn(`[NPZ:JOKER][FAIL] ${nameOrPkg} cannot be resolved`);
      return { gate: 'fail' };
    }
  }
}

export function runResolved(res: ResolveResult): { ok: boolean; status?: number } {
  if (!res.cmd) return { ok: false };
  const args = res.args || [];
  logger.nez && logger.nez('NPZ:JOKER', `running ${res.cmd} ${args.join(' ')}`);
  try {
    const r = spawnSync(res.cmd, args, { stdio: 'inherit', cwd: res.cwd || process.cwd(), shell: false });
    return { ok: r.status === 0, status: r.status ?? undefined };
  } catch (err) {
    logger.error && logger.error(`[NPZ:JOKER] failed to run ${err}`);
    return { ok: false };
  }
}

export default { npzResolve, runResolved };
