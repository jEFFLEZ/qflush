// qflush daemon lightweight test server
// This implementation is minimal and intended to satisfy legacy tests that expect an HTTP control server.

import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';

let _server: http.Server | null = null;
let _state: { safeMode: boolean; mode?: string } = { safeMode: false };

function requireToken(req: http.IncomingMessage): boolean {
  try {
    const expected = process.env.QFLUSH_TOKEN;
    if (!expected) return false;
    const v = (req.headers['x-qflush-token'] || req.headers['X-QFLUSH-TOKEN']) as string | undefined;
    return !!v && String(v) === String(expected);
  } catch (e) { return false; }
}

function writeSafeModes(mode: string) {
  try {
    const dir = path.join(process.cwd(), '.qflush');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, 'safe-modes.json');
    const obj = { mode, updatedAt: new Date().toISOString() };
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {}
}

// new helper: compute flexible checksum for a workspace file path
async function computeFlexibleChecksumForPath(relPath: string) {
  try {
    const filePath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
    if (!fs.existsSync(filePath)) throw new Error('file_not_found');
    const fc = require('../utils/fileChecksum');
    if (fc && typeof fc.flexibleChecksumFile === 'function') {
      const val = await fc.flexibleChecksumFile(filePath);
      return { success: true, checksum: String(val) };
    }
    return { success: false, error: 'checksum_unavailable' };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function startServer(port?: number) {
  return new Promise((resolve, reject) => {
    try {
      if (_server) {
        return resolve({ ok: true, port: (port || process.env.QFLUSHD_PORT || 4500) });
      }

      const p = port || (process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 4500);
      const srv = http.createServer(async (req, res) => {
        try {
          const parsed = url.parse(req.url || '', true);
          const method = (req.method || 'GET').toUpperCase();
          // collect body
          let body = '';
          req.on('data', (chunk) => body += chunk.toString());
          req.on('end', async () => {
            // Token protected endpoints
            if (method === 'POST' && parsed.pathname === '/npz/sleep') {
              if (!requireToken(req)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'forbidden' }));
                return;
              }
              _state.safeMode = true;
              _state.mode = 'sleep';
              writeSafeModes('sleep');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, mode: 'sleep' }));
              return;
            }
            if (method === 'POST' && parsed.pathname === '/npz/wake') {
              if (!requireToken(req)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'forbidden' }));
                return;
              }
              _state.safeMode = false;
              _state.mode = 'normal';
              writeSafeModes('normal');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, mode: 'normal' }));
              return;
            }
            if (method === 'POST' && parsed.pathname === '/npz/joker-wipe') {
              if (!requireToken(req)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'forbidden' }));
                return;
              }
              // pretend to wipe but in test mode skip exit
              _state.safeMode = true;
              _state.mode = 'joker';
              writeSafeModes('joker');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, mode: 'joker' }));
              return;
            }

            // health endpoint
            if (parsed.pathname === '/health' || parsed.pathname === '/status') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            // checksum endpoints
            if (parsed.pathname && parsed.pathname.indexOf('/npz/checksum') === 0) {
              try {
                const baseDir = path.join(process.cwd(), '.qflush');
                if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
                const dbFile = path.join(baseDir, 'checksums.json');
                let db: Record<string, any> = {};
                try { if (fs.existsSync(dbFile)) db = JSON.parse(fs.readFileSync(dbFile, 'utf8') || '{}'); } catch (e) { db = {}; }

                // POST /npz/checksum/store
                if (method === 'POST' && parsed.pathname === '/npz/checksum/store') {
                  try {
                    const obj = body ? JSON.parse(body) : {};
                    const id = obj.id;
                    let checksum = obj.checksum;
                    const ttlMs = obj.ttlMs ? Number(obj.ttlMs) : undefined;
                    const filePath = obj.path;
                    if (!id) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'missing id' }));
                      return;
                    }

                    // if checksum is special token '__auto__' and a path is provided, compute it
                    if (checksum === '__auto__' && filePath) {
                      const comp = await computeFlexibleChecksumForPath(String(filePath));
                      if (!comp.success) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(comp));
                        return;
                      }
                      checksum = comp.checksum;
                    }

                    if (!checksum) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'missing checksum' }));
                      return;
                    }
                    const rec: any = { id, checksum, storedAt: Date.now() };
                    if (ttlMs) rec.expiresAt = Date.now() + Number(ttlMs);
                    db[id] = rec;
                    try { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, id, checksum }));
                    return;
                  } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                    return;
                  }
                }

                // POST /npz/checksum/compute
                if (method === 'POST' && parsed.pathname === '/npz/checksum/compute') {
                  try {
                    const obj = body ? JSON.parse(body) : {};
                    const rel = obj.path;
                    if (!rel) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'missing path' }));
                      return;
                    }
                    const comp = await computeFlexibleChecksumForPath(String(rel));
                    if (!comp.success) {
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify(comp));
                      return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(comp));
                    return;
                  } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                    return;
                  }
                }

                // POST /npz/checksum/verify
                if (method === 'POST' && parsed.pathname === '/npz/checksum/verify') {
                  try {
                    const obj = body ? JSON.parse(body) : {};
                    const id = obj.id;
                    let checksum = obj.checksum;
                    const filePath = obj.path;
                    if (!id || typeof checksum === 'undefined') {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'missing id or checksum' }));
                      return;
                    }
                    const rec = db[id];
                    if (!rec) {
                      res.writeHead(404, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'not_found' }));
                      return;
                    }
                    if (rec.expiresAt && Date.now() > rec.expiresAt) {
                      delete db[id];
                      try { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
                      res.writeHead(404, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'expired' }));
                      return;
                    }

                    // if checksum is '__auto__' and a file path provided, compute actual checksum and compare
                    if (checksum === '__auto__' && filePath) {
                      const comp = await computeFlexibleChecksumForPath(String(filePath));
                      if (!comp.success) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(comp));
                        return;
                      }
                      checksum = comp.checksum;
                    }

                    if (String(rec.checksum) === String(checksum)) {
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: true }));
                      return;
                    }
                    // mismatch -> 412
                    res.writeHead(412, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'mismatch' }));
                    return;
                  } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                    return;
                  }
                }

                // GET /npz/checksum/list
                if (method === 'GET' && parsed.pathname === '/npz/checksum/list') {
                  const now = Date.now();
                  // remove expired
                  for (const k of Object.keys(db)) {
                    if (db[k] && db[k].expiresAt && now > db[k].expiresAt) delete db[k];
                  }
                  try { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
                  const items = Object.values(db);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, count: items.length, items }));
                  return;
                }

                // DELETE /npz/checksum/clear
                if (method === 'DELETE' && parsed.pathname === '/npz/checksum/clear') {
                  db = {};
                  try { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                  return;
                }
              } catch (e) {
                // fallthrough to not found
              }
            }
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not_found' }));
          });
        } catch (e) {
          try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: String(e) })); } catch (_) {}
        }
      });

      srv.listen(p, '127.0.0.1', () => {
        _server = srv;
        resolve({ ok: true, port: p });
      });

      srv.on('error', (err: any) => {
        // If address already in use, attempt to probe existing server on the same port and treat it as OK
        if (err && err.code === 'EADDRINUSE') {
          try {
            const probe = http.request({ hostname: '127.0.0.1', port: p, path: '/health', method: 'GET', timeout: 1000 }, (res) => {
              const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
              if (ok) return resolve({ ok: true, port: p });
              return reject(err);
            });
            probe.on('error', () => reject(err));
            probe.on('timeout', () => { probe.destroy(); reject(err); });
            probe.end();
            return;
          } catch (e) {
            return reject(err);
          }
        }
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function stopServer() {
  return new Promise((resolve) => {
    try {
      if (!_server) return resolve({ ok: true, stopped: false });
      const s = _server;
      _server = null;
      s.close(() => resolve({ ok: true, stopped: true }));
    } catch (e) {
      resolve({ ok: false, error: String(e) });
    }
  });
}

export default { startServer, stopServer };