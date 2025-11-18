import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { logger } from './logger';

export type Lane = { id: number; name: string; url: string };

const DEFAULT_LANES: Lane[] = [
  { id: 0, name: 'primary', url: 'https://api.primary.local' },
  { id: 1, name: 'backup-fast', url: 'https://api.fast.local' },
  { id: 2, name: 'backup-slow', url: 'https://api.slow.local' },
];

const STORE_FILE = path.join(process.cwd(), '.qflash', 'npz-lanes.json');
const DEFAULT_TIMEOUT = 3000; // ms
const PREFERRED_TTL = 24 * 3600 * 1000; // 24h

type Store = Record<string, { laneId: number; ts: number }>;

function ensureStoreDir() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): Store {
  try {
    if (!fs.existsSync(STORE_FILE)) return {};
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(raw) as Store;
  } catch (err) {
    logger.warn(`npz-router: failed to read store ${err}`);
    return {};
  }
}

function writeStore(s: Store) {
  try {
    ensureStoreDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2), 'utf8');
  } catch (err) {
    logger.warn(`npz-router: failed to write store ${err}`);
  }
}

export function getPreferredLane(host: string): number | null {
  const s = readStore();
  const entry = s[host];
  if (!entry) return null;
  if (Date.now() - entry.ts > PREFERRED_TTL) return null;
  return entry.laneId;
}

export function setPreferredLane(host: string, laneId: number) {
  const s = readStore();
  s[host] = { laneId, ts: Date.now() };
  writeStore(s);
}

export function lanesForHost(host: string, lanes: Lane[] = DEFAULT_LANES): Lane[] {
  const pref = getPreferredLane(host);
  if (pref === null) return lanes.slice();
  const idx = lanes.findIndex((l) => l.id === pref);
  if (idx <= 0) return lanes.slice();
  const ordered = [lanes[idx], ...lanes.slice(0, idx), ...lanes.slice(idx + 1)];
  return ordered;
}

// lightweight fetch wrapper that returns {status, headers, body}
async function tryFetch(fullUrl: string, options: any = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const signalOpt = controller ? { signal: controller.signal } : {};
  const opts = { method: options.method || 'GET', headers: options.headers || {}, body: options.body, ...signalOpt };
  let timer: NodeJS.Timeout | null = null;
  if (controller) timer = setTimeout(() => controller.abort(), timeout);
  try {
    // prefer global fetch
    const ff: any = (globalThis as any).fetch
      ? (globalThis as any).fetch
      : (await import('undici')).fetch;
    const res = await ff(fullUrl, opts);
    const text = await res.text();
    if (timer) clearTimeout(timer);
    return { ok: true, status: res.status, headers: res.headers, body: text };
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    return { ok: false, error: err };
  }
}

export type NpzRequest = { method?: string; url: string; headers?: Record<string, string>; body?: any; timeout?: number };
export type NpzResponse = { status?: number; headers?: any; body?: string; error?: any };

export async function npzRoute(req: NpzRequest, lanes: Lane[] = DEFAULT_LANES): Promise<NpzResponse> {
  try {
    const urlObj = new URL(req.url);
    const host = urlObj.host;
    const ordered = lanesForHost(host) as Lane[];

    // attempt primary
    const primary = ordered[0];
    const primaryUrl = req.url.replace(urlObj.origin, primary.url);
    const timeout = req.timeout || DEFAULT_TIMEOUT;

    logger.info(`[NPZ] attempting primary lane ${primary.name} -> ${primaryUrl}`);
    const t0 = await tryFetch(primaryUrl, { method: req.method, headers: req.headers, body: req.body }, timeout);

    if (t0.ok && t0.status && t0.status < 500) {
      logger.info(`[NPZ] primary succeeded (${primary.name})`);
      setPreferredLane(host, primary.id);
      return { status: t0.status, headers: t0.headers, body: t0.body };
    }

    // primary failed -> try fallback(s)
    logger.warn(`[NPZ] primary failed for ${primary.name}, running fallbacks`);

    for (let i = 1; i < ordered.length; i++) {
      const lane = ordered[i];
      const laneUrl = req.url.replace(urlObj.origin, lane.url);
      logger.info(`[NPZ] trying fallback lane ${lane.name} -> ${laneUrl}`);
      const res = await tryFetch(laneUrl, { method: req.method, headers: req.headers, body: req.body }, timeout);
      if (res.ok && res.status && res.status < 500) {
        logger.info(`[NPZ] fallback lane ${lane.name} succeeded`);
        // set preferred to fallback for next time
        setPreferredLane(host, lane.id);

        // replay primary with an extra header (T2)
        const replayHeaders = Object.assign({}, req.headers || {});
        replayHeaders['X-NPZ-FALLBACK'] = '1';
        const replayUrl = primaryUrl;
        logger.info(`[NPZ] replaying primary (${primary.name}) with fallback header`);
        const replay = await tryFetch(replayUrl, { method: req.method, headers: replayHeaders, body: req.body }, timeout);
        if (replay.ok && replay.status && replay.status < 500) {
          logger.info(`[NPZ] replayed primary succeeded after fallback`);
          return { status: replay.status, headers: replay.headers, body: replay.body };
        }

        // if replay failed, return fallback result
        return { status: res.status, headers: res.headers, body: res.body };
      }
    }

    // if all failed, return primary error or generic
    logger.warn('[NPZ] all lanes failed');
    if (t0 && !t0.ok) return { error: t0.error };
    return { status: t0.status, body: t0.body };
  } catch (err) {
    return { error: err };
  }
}

export default { DEFAULT_LANES, npzRoute, getPreferredLane, setPreferredLane, lanesForHost };
