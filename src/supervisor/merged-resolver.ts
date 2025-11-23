import * as npz from '../utils/npz';
import type { ResolveResult } from '../utils/npz';
import { listRunning } from './index';

// Score helper
function score(r: ResolveResult | null | undefined) {
  if (!r) return 0;
  switch (r.gate) {
    case 'green': return 3;
    case 'yellow': return 2;
    case 'dlx': return 1;
    default: return 0;
  }
}

export type ResolveOptions = { cwd?: string };

/**
 * Merge two ResolveResult candidates into one, preferring supervisor result but
 * filling missing fields from default result.
 */
function mergeResults(sup: ResolveResult, def: ResolveResult | null | undefined): ResolveResult {
  // prefer supervisor gate but fall back to yellow if supervisor has no gate
  const gate = sup && sup.gate ? sup.gate : (def && def.gate ? def.gate : 'yellow');
  const out: ResolveResult = {
    gate,
    cmd: sup.cmd || (def && def.cmd) || undefined,
    args: sup.args ? [...sup.args] : (def && def.args ? [...def.args] : []),
    cwd: sup.cwd ?? (def && (def.cwd ?? undefined))
  };
  return out;
}

/**
 * Try to create a supervisor-based ResolveResult from currently running managed processes.
 * This is a lightweight heuristic: if a managed process name matches the requested package
 * or the recorded cmd includes the package name, we return a green result.
 */
function supervisorCandidate(nameOrPkg: string): ResolveResult | null {
  try {
    const running = listRunning();
    for (const r of running) {
      try {
        if (!r) continue;
        // Match by exact name or package-like match
        if (r.name === nameOrPkg || r.cmd === nameOrPkg || (r.cmd && r.cmd.includes(nameOrPkg)) || (r.log && r.log.includes(nameOrPkg))) {
          return { gate: 'green', cmd: r.cmd, args: r.args || [], cwd: r.cwd };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Resolve using supervisor and default npz strategies in parallel, then merge according to priority.
 * By default supervisor result wins if valid; otherwise fallback to default.
 */
export async function resolveMerged(nameOrPkg: string, opts: ResolveOptions = {}): Promise<ResolveResult> {
  const defPromise = Promise.resolve().then(() => npz.npzResolve(nameOrPkg, opts));
  const supPromise = Promise.resolve().then(() => supervisorCandidate(nameOrPkg));

  const [defR, supR] = await Promise.all([defPromise, supPromise]);

  const sScore = score(supR as ResolveResult | null);
  const dScore = score(defR as ResolveResult | null);

  if (supR && sScore > 0) {
    // supervisor wins; merge to fill gaps
    return mergeResults(supR as ResolveResult, defR as ResolveResult | null | undefined);
  }

  if (defR && dScore > 0) return defR as ResolveResult;

  // last-resort: pick highest score
  if (sScore >= dScore && supR) return supR as ResolveResult;
  if (defR) return defR as ResolveResult;

  return { gate: 'fail' };
}

export default { resolveMerged };
