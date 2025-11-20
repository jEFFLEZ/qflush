// ROME-TAG: 0xA1EC50

import 'dotenv/config';
const express = require('express');
import http from 'http';
const fs = require('fs');
const path = require('path');
const { join } = path;

// Optional Redis — create client via helper (returns null when disabled or no URL)
import { createRedisClient } from '../utils/redis';
const redisClient = createRedisClient();
if (!redisClient) {
  console.log('Redis client not created; using in-memory fallback');
}

// try to import gumroad helper if present
let gumroad: any = null;
try {
   
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

// auth middleware
import { requireQflushToken } from './auth-middleware';
// daemon control import
import { setReloadHandler } from './daemon-control';

// load Rome index from .qflush/rome-index.json (if present)
import { loadRomeIndexFromDisk, getCachedRomeIndex, startRomeIndexAutoRefresh, onRomeIndexUpdated } from '../rome/index-loader';
import { evaluateIndex, computeEngineActionsSafe } from '../rome/engine';
import { loadLogicRules, evaluateAllRules, getRules } from '../rome/logic-loader';
import { executeAction } from '../rome/executor';
import { getEmitter, startIndexWatcher } from '../rome/events';
import { initCopilotBridge as _initCopilotBridge, emitEngineState as _emitEngineState, emitRuleEvent as _emitRuleEvent, emitDiagnostic as _emitDiagnostic, getConfig as _getCopilotConfig } from '../rome/copilot-bridge';

// Respect environment to disable copilot bridge at runtime
const DISABLE_COPILOT = process.env.QFLUSH_DISABLE_COPILOT === '1' || String(process.env.QFLUSH_DISABLE_COPILOT).toLowerCase() === 'true' || process.env.QFLUSH_TELEMETRY === '0';
const ENABLE_COPILOT = !DISABLE_COPILOT;

// Provide safe wrappers (no-op when disabled)
const initCopilotBridge: any = ENABLE_COPILOT ? _initCopilotBridge : async () => {};
const emitEngineState: any = ENABLE_COPILOT ? _emitEngineState : () => {};
const emitRuleEvent: any = ENABLE_COPILOT ? _emitRuleEvent : () => {};
const emitDiagnostic: any = ENABLE_COPILOT ? _emitDiagnostic : () => {};
const getCopilotConfig: any = ENABLE_COPILOT ? _getCopilotConfig : () => ({ enabled: false });

// linker
import { computeRomeLinksForFiles, computeRomeLinks, mergeAndWrite, readExistingLinks, resolveRomeToken, romeLinksEmitter } from '../rome/linker';

// in-memory engine history buffer (fallback)
const engineHistory: any[] = [];

// mapping is OFF by default; can be forced on with QFLUSH_ENABLE_MAPPING=1
const FORCE_DISABLE_MAPPING = true; // set to true to permanently disable automatic mapping in this build
const ENABLE_MAPPING = !FORCE_DISABLE_MAPPING && (process.env.QFLUSH_ENABLE_MAPPING === '1' || String(process.env.QFLUSH_ENABLE_MAPPING).toLowerCase() === 'true');

if (FORCE_DISABLE_MAPPING) {
  console.log('Rome mapping permanently disabled in this build (FORCE_DISABLE_MAPPING=true)');
} else if (!ENABLE_MAPPING) {
  console.log('Rome mapping is disabled by default. Set QFLUSH_ENABLE_MAPPING=1 to enable automatic mapping and index refresh.');
}

// start Rome index auto refresh only when mapping enabled and not running under tests
if (!process.env.VITEST && ENABLE_MAPPING) {
  startRomeIndexAutoRefresh(15 * 1000); // refresh every 15s
}

// Evaluate engine at startup and on refresh (guarded) - only when mapping enabled
if (!process.env.VITEST && ENABLE_MAPPING) {
  // call the safe compute function from engine
  computeEngineActionsSafe();
}

// listen to rome.index.updated events only when mapping enabled
if (ENABLE_MAPPING) {
  onRomeIndexUpdated(async (payload) => {
    try {
      if (process.env.VITEST) return;
      const { oldIndex, newIndex, changedPaths } = payload;
      console.log('rome.index.updated event, changedPaths=', changedPaths);
      loadLogicRules();

      // recompute logic actions
      const idx = getCachedRomeIndex();
      const matches = evaluateAllRules(idx, changedPaths || []);
      if (matches && matches.length) {
        for (const m of matches) {
          for (const act of m.actions) {
            console.log('Executing action for', m.path, act);
            const res = await executeAction(act, { path: m.path });
            console.log('action result', res);
            engineHistory.push({ t: Date.now(), path: m.path, action: act, result: res });
            try { emitRuleEvent({ rule: 'unknown', path: m.path, matchContext: {}, actions: m.actions, result: res }); } catch (e) {}
          }
        }
      }

      // incremental recompute of rome-links for changed files
      try {
        const projectRoot = process.cwd();
        const absFiles = (changedPaths || []).map((p: string) => join(projectRoot, p));
        const newLinks = computeRomeLinksForFiles(projectRoot, absFiles);
        mergeAndWrite(projectRoot, newLinks);
        console.log('rome-links: updated for', absFiles.length, 'files');
      } catch (e) {
        console.warn('rome-links incremental update failed', String(e));
      }

      if (matches && matches.length) {
        for (const m of matches) {
          for (const act of m.actions) {
            // already handled above
          }
        }
      }
    } catch (e) { console.warn('onRomeIndexUpdated handler failed', String(e)); }
  });
} else {
  // mapping disabled
}

// also start index watcher only when mapping enabled
if (!process.env.VITEST && ENABLE_MAPPING) {
  startIndexWatcher(3000);
} else if (!ENABLE_MAPPING) {
  // no-op
}

// --- One-time checksum cache ---
// Redis removed: use in-memory Map only
const CHECKSUM_DEFAULT_TTL_MS = Number(process.env.QFLUSH_CHECKSUM_TTL_MS) || 60 * 1000; // 60 seconds default

// in-memory fallback store
type ChecksumEntry = { checksum: string; expiresAt: number };
const checksumCache = new Map<string, ChecksumEntry>();

// Insert checksum handlers here (before pourparler endpoints)
app.post('/npz/checksum/store', async (req: any, res: any) => {
  const { id, checksum, ttlMs } = req.body || {};
  console.log('/npz/checksum/store called with', req.body);
  if (!id || !checksum) return res.status(400).json({ success: false, error: 'missing id or checksum' });
  const ttl = typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : CHECKSUM_DEFAULT_TTL_MS;

  checksumCache.set(String(id), { checksum: String(checksum), expiresAt: Date.now() + ttl });
  audit({ t: Date.now(), event: 'checksum_stored_mem', id: String(id) });
  console.log('stored in memory', id);
  return res.json({ success: true, id: String(id), ttlMs: ttl, backend: 'memory' });
});

app.post('/npz/checksum/verify', async (req: any, res: any) => {
  const { id, checksum } = req.body || {};
  if (!id || !checksum) return res.status(400).json({ success: false, error: 'missing id or checksum' });

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

app.get('/npz/checksum/list', async (_req: any, res: any) => {
  const now = Date.now();
  const results: { id: string; expiresInMs: number }[] = [];
  for (const [id, entry] of checksumCache.entries()) {
    results.push({ id, expiresInMs: Math.max(0, entry.expiresAt - now) });
  }
  return res.json({ success: true, count: results.length, items: results, backend: 'memory' });
});

// clear checksums: DELETE /npz/checksum/clear
app.delete('/npz/checksum/clear', async (_req: any, res: any) => {
  const cleared = checksumCache.size;
  checksumCache.clear();
  audit({ t: Date.now(), event: 'checksum_cleared_mem', cleared });
  return res.json({ success: true, cleared, backend: 'memory' });
});

// expose a simple Rome index HTTP endpoint for admin/clients
app.get('/npz/rome-index', (_req: any, res: any) => {
  try {
    // ensure index is loaded from disk
    const idx = getCachedRomeIndex() || loadRomeIndexFromDisk();
    const all = Object.values(idx || {});
    const q = (_req.query && String(_req.query.type)) || null;
    const items = q ? all.filter((it: any) => it && it.type === q) : all;
    return res.json({ success: true, count: items.length, items });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// new endpoints for rome-links: list and regenerate
app.get('/npz/rome-links', (_req: any, res: any) => {
  try {
    const projectRoot = process.cwd();
    const existing = readExistingLinks(projectRoot);
    return res.json({ success: true, count: existing.length, refs: existing });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.post('/npz/rome-links/regenerate', async (_req: any, res: any) => {
  try {
    const projectRoot = process.cwd();
    const links = computeRomeLinks(projectRoot);
    mergeAndWrite(projectRoot, links);
    return res.json({ success: true, count: links.length });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// resolve a specific token
app.get('/npz/rome-links/resolve', (_req: any, res: any) => {
  try {
    const projectRoot = process.cwd();
    const from = _req.query && typeof _req.query.from === 'string' ? String(_req.query.from) : '';
    const token = _req.query && typeof _req.query.token === 'string' ? String(_req.query.token) : '';
    if (!token) return res.status(400).json({ success: false, error: 'missing token' });
    const resolved = resolveRomeToken(projectRoot, from, token);
    return res.json({ success: true, path: resolved.path, score: resolved.score });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// Server-Sent Events stream for rome-links updates
app.get('/npz/rome-links/stream', (req: any, res: any) => {
  try {
    // set SSE headers
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': '*',
    });

    // send initial data
    const projectRoot = process.cwd();
    const existing = readExistingLinks(projectRoot);
    res.write(`event: initial\ndata: ${JSON.stringify({ refs: existing })}\n\n`);

    const handler = (updated: any) => {
      try {
        res.write(`event: updated\ndata: ${JSON.stringify({ refs: updated })}\n\n`);
      } catch (e) {
        // ignore
      }
    };
    romeLinksEmitter.on('updated', handler);

    // cleanup on client close
    req.on('close', () => {
      try { romeLinksEmitter.removeListener('updated', handler); } catch (e) {}
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
});

// remove duplicated checksum block at end
// Ensure this block appears before startServer and 404 handlers

// fallthrough 404 handler (JSON)
app.use((req: any, res: any) => {
  res.status(404).json({ success: false, error: 'not_found', path: req.path });
});

// error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('unhandled error in express:', err && err.stack ? err.stack : String(err));
  res.status(500).json({ success: false, error: 'internal_error', message: String(err) });
});

let server: any = null;
let auxServer: any = null;

function startAuxServer() {
  try {
    auxServer = http.createServer(async (req, res) => {
      try {
        if (req.url && req.url.startsWith('/npz/rome-index')) {
          const idx = getCachedRomeIndex() || loadRomeIndexFromDisk();
          const all = Object.values(idx || {});
          const q = (req.url && req.url.includes('?') && new URL('http://localhost' + req.url).searchParams.get('type')) || null;
          const items = q ? all.filter((it: any) => it && it.type === q) : all;
          const body = JSON.stringify({ success: true, count: items.length, items });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(body);
          return;
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: String(e) }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'not_found', path: req.url }));
    });
    auxServer.on('error', (err: any) => {
      try {
        if (err && err.code === 'EADDRINUSE') {
          console.log('[QFLUSH] auxiliary server port 4500 already in use, skipping auxiliary server');
          try { auxServer.close(); } catch (e) {}
          auxServer = null;
          return;
        }
      } catch (e) {
        // ignore
      }
      console.warn('auxiliary server error', String(err));
    });
    try {
      auxServer.listen(4500, () => {
        console.log('[QFLUSH] auxiliary test server on :4500 ready');
      });
    } catch (e) {
      console.warn('failed to bind auxiliary server on :4500', String(e));
      try { auxServer.close(); } catch (e) {}
      auxServer = null;
    }
  } catch (e) {
    console.warn('failed to start auxiliary server on :4500', String(e));
  }
}

function stopAuxServer() {
  try {
    if (auxServer) {
      auxServer.close();
      auxServer = null;
    }
  } catch (e) {
    // ignore
  }
}
export function startServer(port?: number) {
  const p = port || PORT;
  server = app.listen(p, () => {
    console.log(`qflush running on http://localhost:${p}`);
  });
  // also start auxiliary test server on port 4500 to satisfy tests expecting that endpoint
  try { startAuxServer(); } catch (e) {}
  return server;
}

export function stopServer() {
  try {
    if (server) {
      server.close();
      server = null;
    }
    try { stopAuxServer(); } catch (e) {}
  } catch (e) {
    // ignore
  }
}

// register reload handler to stop/start server (placed after start/stop definitions)
import { setReloadHandler as __setReloadHandler } from './daemon-control';
__setReloadHandler(async () => {
  console.log('daemon reload requested');
  try {
    stopServer();
    await new Promise((r) => setTimeout(r, 200));
    startServer();
    console.log('daemon reloaded');
  } catch (e) {
    console.warn('daemon reload failed', String(e));
  }
});

// if the module is run directly, start the server
if (require.main === module) {
  startServer();
}
