// src/cortex/router.ts
import type { CortexPacket } from "./types";
import alias from '../utils/alias';

export type CortexRouteHandler = (packet: CortexPacket) => Promise<any> | any;

const noopHandler: CortexRouteHandler = async () => {
  // router stub : exorcised version, does nothing for now
  return;
};

// runtime-safe imports (may return undefined)
const executorMod: any = alias.importUtil('../rome/executor') || alias.importUtil('@rome/executor') || (typeof require !== 'undefined' ? (() => { try { return require('../rome/executor'); } catch (e) { try { return require('src/rome/executor'); } catch (e2) { return undefined; } } })() : undefined);
const runSpyderMod: any = alias.importUtil('../commands/spyder') || alias.importUtil('@commands/spyder') || (typeof require !== 'undefined' ? (() => { try { return require('../commands/spyder'); } catch (e) { try { return require('src/commands/spyder'); } catch (e2) { return undefined; } } })() : undefined);
const emitMod: any = alias.importUtil('./emit') || alias.importUtil('@cortex/emit') || (typeof require !== 'undefined' ? (() => { try { return require('./emit'); } catch (e) { try { return require('src/cortex/emit'); } catch (e2) { return undefined; } } })() : undefined);
const routesCfg: any = alias.importUtil('./routesConfig') || alias.importUtil('@cortex/routesConfig') || (typeof require !== 'undefined' ? (() => { try { return require('./routesConfig'); } catch (e) { try { return require('src/cortex/routesConfig'); } catch (e2) { return undefined; } } })() : undefined);

// helper wrappers
async function safeExecuteAction(action: string, ctx: any = {}) {
  try {
    if (!executorMod) return { success: false, error: 'executor_unavailable' };
    const fn = executorMod.executeAction || (executorMod.default && executorMod.default.executeAction);
    if (typeof fn !== 'function') return { success: false, error: 'executeAction_unavailable' };
    return await fn(action, ctx);
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

async function safeRunSpyder(argv: string[] = []) {
  try {
    if (!runSpyderMod) return { code: null, error: 'spyder_unavailable' };
    const fn = runSpyderMod.default || runSpyderMod;
    if (typeof fn !== 'function') return { code: null, error: 'spyder_run_unavailable' };
    return await fn(argv);
  } catch (e) {
    return { code: null, error: String(e) };
  }
}

function safeEmit(eventName: string, payload: any) {
  try {
    if (!emitMod) return false;
    const fn = emitMod.cortexEmit || (emitMod.default && emitMod.default.cortexEmit);
    if (typeof fn !== 'function') return false;
    fn(eventName, payload);
    return true;
  } catch (e) {
    return false;
  }
}

// Handlers
const handlers: Record<string, CortexRouteHandler> = {
  'cortex:npz-graph': async (pkt) => {
    // prefer payload.path
    const filePath = pkt.payload && pkt.payload.path ? pkt.payload.path : 'unknown';
    const res = await safeExecuteAction('npz.encode', { path: filePath });
    return res;
  },
  'npz-graph': async (pkt) => {
    const filePath = pkt.payload && pkt.payload.path ? pkt.payload.path : 'unknown';
    const res = await safeExecuteAction('npz.encode', { path: filePath });
    return res;
  },
  'cortex:drip': async (pkt) => {
    const ok = safeEmit('CORTEX-DRIP', pkt.payload);
    return { ok };
  },
  'cortex:enable-spyder': async (pkt) => {
    // write config then attempt start
    try {
      const cfg = pkt.payload || {};
      // if payload provides args array, pass through
      const args = Array.isArray(cfg.args) && cfg.args.length ? cfg.args : ['start'];
      const res = await safeRunSpyder(args);
      return { ok: true, res };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

// normalize and lookup function
function findHandler(pkt: CortexPacket): CortexRouteHandler {
  const candidates: string[] = [];
  if (pkt.type) candidates.push(String(pkt.type));
  if (pkt.payload && typeof pkt.payload === 'object') {
    if (typeof pkt.payload.cmd === 'string') candidates.push(String(pkt.payload.cmd));
    if (typeof pkt.payload.command === 'string') candidates.push(String(pkt.payload.command));
  }
  // add lowercase variants
  for (const c of candidates.slice()) candidates.push(c.toLowerCase());

  for (const c of candidates) {
    const key = String(c || '').toLowerCase();
    if (handlers[key]) return handlers[key];
  }

  // fallback to routesCfg pick logic if present
  try {
    if (routesCfg && typeof routesCfg.pickBestRoute === 'function') {
      const pick = routesCfg.pickBestRoute(candidates as any) as string | null;
      if (pick) {
        const k = String(pick).toLowerCase();
        if (handlers[k]) return handlers[k];
      }
    }
  } catch (e) {}

  return noopHandler;
}

export async function routeCortexPacket(packet: CortexPacket): Promise<any> {
  const h = findHandler(packet);
  try {
    return await h(packet);
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export default { routeCortexPacket };
