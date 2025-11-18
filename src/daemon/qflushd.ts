// ROME-TAG: 0xA1EC50

import 'dotenv/config';
const express = require('express');
const fs = require('fs');
const path = require('path');

// optional Redis support
let Redis: any = null;
let redisClient: any = null;
const REDIS_URL = process.env.REDIS_URL || process.env.QFLUSH_REDIS_URL || '';
if (REDIS_URL) {
  try {
    // require lazily so repo doesn't force dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Redis = require('ioredis');
    redisClient = new Redis(REDIS_URL);
    // best-effort connect
    redisClient.on('error', (err: any) => {
      console.warn('qflush: redis error', String(err));
      redisClient = null;
    });
  } catch (e) {
    // ignore if ioredis not installed
    redisClient = null;
  }
}

// try to import gumroad helper if present
let gumroad: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  gumroad = require('../utils/gumroad-license');
} catch (e) {
  // ignore if not available
}

const PORT = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 4500;
const AUDIT_DIR = path.join(process.cwd(), '.qflush');
const AUDIT_LOG = path.join(AUDIT_DIR, 'license-activations.log');

function ensureAuditDir() {
  try {
    if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function audit(line: any) {
  try {
    ensureAuditDir();
    fs.appendFileSync(AUDIT_LOG, (typeof line === 'string' ? line : JSON.stringify(line)) + '\n', 'utf8');
  } catch (e) {
    // ignore
  }
}

const app = express();
app.use(express.json());

// load Rome index from .qflush/rome-index.json (if present)
import { loadRomeIndexFromDisk, getCachedRomeIndex, startRomeIndexAutoRefresh, onRomeIndexUpdated } from '../rome/index-loader';
import { evaluateIndex } from '../rome/engine';
import { loadLogicRules, evaluateAllRules, getRules } from '../rome/logic-loader';
import { executeAction } from '../rome/executor';
import { getEmitter, startIndexWatcher } from '../rome/events';

startRomeIndexAutoRefresh(15 * 1000); // refresh every 15s

// in-memory execution history
const engineHistory: any[] = [];
// Copilot message history and SSE clients
const copilotHistory: any[] = [];
const copilotClients: any[] = [];

// Evaluate engine at startup and on refresh
function computeEngineActions() {
  try {
    const idx = getCachedRomeIndex();
    const actions = evaluateIndex(idx);
    console.log('QFLUSH Engine computed actions:');
    actions.forEach((a) => console.log(JSON.stringify(a)));

    // load logic rules and evaluate simple matches
    const rules = loadLogicRules();
    console.log('Loaded logic rules:', rules.map(r=>r.name));
    for (const p of Object.values(idx)) {
      const matches = evaluateAllRules(idx, []);
      if (matches.length) console.log('Logic matches', matches);
    }

    return actions;
  } catch (e) {
    console.warn('engine compute failed', String(e));
    return [];
  }
}

// Copilot endpoints
app.post('/copilot/message', (req: any, res: any) => {
  try {
    const body = req.body || {};
    const msg = { id: Date.now(), receivedAt: new Date().toISOString(), message: body.message || '', meta: body.meta || {} };
    copilotHistory.push(msg);
    // notify SSE clients
    for (const cl of copilotClients) {
      try { cl.write(`data: ${JSON.stringify(msg)}\n\n`); } catch (e) {}
    }
    return res.json({ success: true, id: msg.id });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.get('/copilot/stream', (req: any, res: any) => {
  // SSE
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  });
  res.write('\n');
  copilotClients.push(res);
  req.on('close', () => {
    const idx = copilotClients.indexOf(res);
    if (idx !== -1) copilotClients.splice(idx, 1);
  });
});

app.get('/copilot/history', (_req: any, res: any) => {
  return res.json({ success: true, count: copilotHistory.length, items: copilotHistory.slice(-100) });
});

// manual API to run engine evaluation and execute matching actions
app.post('/npz/engine/run', async (_req: any, res: any) => {
  try {
    const idx = getCachedRomeIndex();
    const payload = _req.body || {};
    const changed = payload.changedPaths || Object.keys(idx);
    const matches = evaluateAllRules(idx, changed);
    const results: any[] = [];
    for (const m of matches) {
      for (const act of m.actions) {
        const r = await executeAction(act, { path: m.path });
        results.push({ path: m.path, action: act, result: r });
        engineHistory.push({ t: Date.now(), path: m.path, action: act, result: r });
      }
    }
    return res.json({ success: true, count: results.length, results });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.get('/npz/engine/history', (_req: any, res: any) => {
  return res.json({ success: true, count: engineHistory.length, items: engineHistory.slice(-50) });
});

// initial compute
computeEngineActions();

// listen to rome.index.updated events
onRomeIndexUpdated(async (payload) => {
  try {
    const { oldIndex, newIndex, changedPaths } = payload;
    console.log('rome.index.updated event, changedPaths=', changedPaths);
    loadLogicRules();
    const idx = getCachedRomeIndex();
    const matches = evaluateAllRules(idx, changedPaths || []);
    if (matches && matches.length) {
      for (const m of matches) {
        for (const act of m.actions) {
          console.log('Executing action for', m.path, act);
          const res = await executeAction(act, { path: m.path });
          console.log('action result', res);
          engineHistory.push({ t: Date.now(), path: m.path, action: act, result: res });
        }
      }
    }
  } catch (e) { console.warn('onRomeIndexUpdated handler failed', String(e)); }
});

// also start index watcher so file system changes are picked up
startIndexWatcher(3000);

// --- One-time checksum cache ---
// If Redis is configured, use Redis keys with TTL and a sorted set index for listing. Otherwise fallback to in-memory Map.
const CHECKSUM_DEFAULT_TTL_MS = Number(process.env.QFLUSH_CHECKSUM_TTL_MS) || 60 * 1000; // 60 seconds default

// in-memory fallback store
type ChecksumEntry = { checksum: string; expiresAt: number };
const checksumCache = new Map<string, ChecksumEntry>();

// Redis key helpers
const REDIS_KEY_PREFIX = 'qflush:npz:checksum:';
const REDIS_INDEX_KEY = 'qflush:npz:checksum:ids';

async function redisStore(id: string, checksum: string, ttlMs: number) {
  if (!redisClient) return false;
  const key = REDIS_KEY_PREFIX + id;
  const expiresAt = Date.now() + ttlMs;
  // set key with PX TTL
  await redisClient.set(key, checksum, 'PX', ttlMs);
  // add to sorted set with score = expiresAt
  await redisClient.zadd(REDIS_INDEX_KEY, expiresAt, id);
  return true;
}

async function redisGet(id: string) {
  if (!redisClient) return null;
  const key = REDIS_KEY_PREFIX + id;
  const val = await redisClient.get(key);
  if (!val) return null;
  // obtain TTL to compute expiresAt
  const ttlMs = await redisClient.pttl(key);
  const expiresAt = Date.now() + (ttlMs > 0 ? ttlMs : 0);
  return { checksum: val, expiresAt };
}

async function redisDelete(id: string) {
  if (!redisClient) return false;
  const key = REDIS_KEY_PREFIX + id;
  await redisClient.del(key);
  await redisClient.zrem(REDIS_INDEX_KEY, id);
  return true;
}

async function redisList() {
  if (!redisClient) return [] as { id: string; expiresAt: number }[];
  // remove expired ids from index
  const now = Date.now();
  await redisClient.zremrangebyscore(REDIS_INDEX_KEY, 0, now - 1);
  const items = await redisClient.zrangebyscore(REDIS_INDEX_KEY, now, '+inf', 'WITHSCORES');
  // zrangebyscore with WITHSCORES returns [id, score, id, score, ...]
  const results: { id: string; expiresAt: number }[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const id = items[i];
    const score = Number(items[i + 1]);
    results.push({ id, expiresAt: score });
  }
  return results;
}

async function redisClear() {
  if (!redisClient) return 0;
  const ids = await redisClient.zrange(REDIS_INDEX_KEY, 0, -1);
  if (ids.length === 0) return 0;
  const keys = ids.map((id: string) => REDIS_KEY_PREFIX + id);
  await redisClient.del(...keys);
  const removed = await redisClient.del(REDIS_INDEX_KEY);
  return ids.length;
}

function cleanupChecksumCache() {
  const now = Date.now();
  for (const [key, entry] of checksumCache.entries()) {
    if (entry.expiresAt <= now) checksumCache.delete(key);
  }
}
// run cleanup periodically for memory fallback
setInterval(cleanupChecksumCache, 30 * 1000).unref();

// store checksum: POST /npz/checksum/store { id, checksum, ttlMs? }
app.post('/npz/checksum/store', async (req: any, res: any) => {
  const { id, checksum, ttlMs } = req.body || {};
  if (!id || !checksum) return res.status(400).json({ success: false, error: 'missing id or checksum' });
  const ttl = typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : CHECKSUM_DEFAULT_TTL_MS;
  if (redisClient) {
    try {
      await redisStore(String(id), String(checksum), ttl);
      audit({ t: Date.now(), event: 'checksum_stored_redis', id: String(id) });
      return res.json({ success: true, id: String(id), ttlMs: ttl, backend: 'redis' });
    } catch (e) {
      // fallback to in-memory
    }
  }
  checksumCache.set(String(id), { checksum: String(checksum), expiresAt: Date.now() + ttl });
  audit({ t: Date.now(), event: 'checksum_stored_mem', id: String(id) });
  return res.json({ success: true, id: String(id), ttlMs: ttl, backend: 'memory' });
});

// verify checksum: POST /npz/checksum/verify { id, checksum }
// if verified, remove from cache (one-time) and return success
app.post('/npz/checksum/verify', async (req: any, res: any) => {
  const { id, checksum } = req.body || {};
  if (!id || !checksum) return res.status(400).json({ success: false, error: 'missing id or checksum' });

  if (redisClient) {
    try {
      const rec = await redisGet(String(id));
      if (!rec) return res.status(404).json({ success: false, error: 'checksum not found or expired' });
      if (rec.checksum !== String(checksum)) {
        audit({ t: Date.now(), event: 'checksum_mismatch_redis', id: String(id), provided: String(checksum), expected: rec.checksum });
        return res.status(400).json({ success: false, error: 'checksum mismatch' });
      }
      await redisDelete(String(id));
      audit({ t: Date.now(), event: 'checksum_verified_redis', id: String(id) });
      return res.json({ success: true, id: String(id), backend: 'redis' });
    } catch (e) {
      // fallback to memory
    }
  }

  const entry = checksumCache.get(String(id));
  if (!entry) return res.status(404).json({ success: false, error: 'checksum not found or expired' });
  if (entry.checksum !== String(checksum)) {
    audit({ t: Date.now(), event: 'checksum_mismatch_mem', id: String(id), provided: String(checksum), expected: entry.checksum });
    return res.status(400).json({ success: false, error: 'checksum mismatch' });
  }
  // match: remove and return success
  checksumCache.delete(String(id));
  audit({ t: Date.now(), event: 'checksum_verified_mem', id: String(id) });
  return res.json({ success: true, id: String(id), backend: 'memory' });
});

// list checksums: GET /npz/checksum/list
app.get('/npz/checksum/list', async (_req: any, res: any) => {
  if (redisClient) {
    try {
      const items = await redisList();
      const now = Date.now();
      const result = items.map((it: any) => ({ id: it.id, expiresInMs: Math.max(0, it.expiresAt - now) }));
      return res.json({ success: true, count: result.length, items: result, backend: 'redis' });
    } catch (e) {
      // fallback
    }
  }
  const now = Date.now();
  const results: { id: string; expiresInMs: number }[] = [];
  for (const [id, entry] of checksumCache.entries()) {
    results.push({ id, expiresInMs: Math.max(0, entry.expiresAt - now) });
  }
  return res.json({ success: true, count: results.length, items: results, backend: 'memory' });
});

app.get('/npz/rome-index', (_req: any, res: any) => {
  try {
    const index = getCachedRomeIndex();
    const q: any = _req.query || {};
    if (q.type) {
      const t = String(q.type);
      const items = Object.values(index).filter((r: any) => r.type === t);
      return res.json({ success: true, count: items.length, items });
    }
    return res.json({ success: true, count: Object.keys(index).length, items: Object.values(index) });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// clear checksums: DELETE /npz/checksum/clear
app.delete('/npz/checksum/clear', async (_req: any, res: any) => {
  if (redisClient) {
    try {
      const cleared = await redisClear();
      audit({ t: Date.now(), event: 'checksum_cleared_redis', cleared });
      return res.json({ success: true, cleared, backend: 'redis' });
    } catch (e) {
      // fallback
    }
  }
  const cleared = checksumCache.size;
  checksumCache.clear();
  audit({ t: Date.now(), event: 'checksum_cleared_mem', cleared });
  return res.json({ success: true, cleared, backend: 'memory' });
});

app.get('/license/status', (_req: any, res: any) => {
  if (!gumroad || typeof gumroad.loadLicense !== 'function') return res.json({ success: true, license: null });
  const rec = gumroad.loadLicense();
  return res.json({ success: true, license: rec, valid: rec ? gumroad.isLicenseValid(rec) : false });
});

// public webhook endpoint suggested: /qflush/license/webhook
app.post('/qflush/license/webhook', (req: any, res: any) => {
  const payload = req.body || {};
  audit({ t: Date.now(), event: 'gumroad_webhook', payload });

  // inspect payload for refund/chargeback/subscription cancel
  const purchase = payload.purchase || payload.data || null;
  let shouldClear = false;

  if (purchase) {
    if (purchase.refunded || purchase.chargebacked) shouldClear = true;
    if (purchase.subscription_cancelled_at || purchase.subscription_ended_at) shouldClear = true;
  }

  const ev = (payload.event || payload.type || '').toString().toLowerCase();
  if (ev.includes('refund') || ev.includes('chargeback') || ev.includes('subscription_cancel')) shouldClear = true;

  if (shouldClear && gumroad && typeof gumroad.clearLicense === 'function') {
    try {
      gumroad.clearLicense();
      audit({ t: Date.now(), event: 'license_cleared_via_webhook' });
    } catch (e) {
      audit({ t: Date.now(), event: 'license_clear_failed', err: String(e) });
    }
  }

  return res.json({ ok: true });
});

// legacy webhook path used earlier
app.post('/webhooks/gumroad', (req: any, res: any) => {
  // forward to same handler logic
  return app.handle(req, res);
});

app.get('/status', (_req: any, res: any) => {
  res.json({ ok: true, port: PORT, checksumCacheSize: checksumCache.size, redis: !!redisClient });
});

// expose npz pourparler endpoints
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pourparler = require('../utils/npz-pourparler');

  app.post('/npz/pourparler', (req: any, res: any) => {
    try {
      const body = req.body || {};
      const action = body.action || 'color'; // default action
      const text = String(body.text || '');

      if (action === 'encode') {
        const enc = pourparler.encodeAscii4(text);
        return res.json({ success: true, encoded: enc });
      }

      if (action === 'color') {
        const colored = pourparler.colorizeAscii4(text);
        return res.json({ success: true, colored });
      }

      if (action === 'start') {
        const s = pourparler.startSession(body.systemPrompt || '');
        return res.json({ success: true, session: s });
      }

      if (action === 'send') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const m = pourparler.sendMessage(body.sessionId, body.role || 'user', String(body.text || ''));
        return res.json({ success: true, message: m });
      }

      if (action === 'history') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const h = pourparler.getHistory(body.sessionId);
        return res.json({ success: true, history: h });
      }

      if (action === 'end') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const ok = pourparler.endSession(body.sessionId);
        return res.json({ success: true, ended: ok });
      }

      if (action === 'checksum') {
        try {
          const cssPath = path.join(process.cwd(), 'extensions', 'vscode-npz', 'pourparler-checksum.css');
            if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            // extract the checksum value
            const m = content.match(/--npz-pourparler-checksum:\s*'([a-f0-9]+)'/i);
            const checksum = m ? m[1] : null;
            return res.json({ success: true, checksum, path: cssPath });
          }
          return res.status(404).json({ success: false, error: 'css not found' });
        } catch (err) {
          return res.status(500).json({ success: false, error: String(err) });
        }
      }

      return res.status(400).json({ success: false, error: 'unknown action' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: String(e) });
    }
  });
} catch (e) {
  // ignore if module not present
}

let server: any = null;
export function startServer(port?: number) {
  const p = port || PORT;
  server = app.listen(p, () => {
    console.log(`qflush running on http://localhost:${p}`);
  });
  return server;
}

export function stopServer() {
  try {
    if (server) server.close();
  } catch (e) {
    // ignore
  }
}

// if the module is run directly, start the server
if (require.main === module) {
  startServer();
}
