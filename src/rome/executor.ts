// ROME-TAG: 0xDE237C

import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { saveEngineHistory } from './storage';
import { callReload } from './daemon-control';

const DEFAULT_CFG = { allowedCommandSubstrings: ['npm','node','echo'], allowedCommands: ['echo hello','npm run build'], commandTimeoutMs: 15000, webhookUrl: '' };

function loadConfig() {
  try {
    const p = path.join(process.cwd(), '.qflush', 'logic-config.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}
  return DEFAULT_CFG;
}

function safeExecFile(cmd: string, cwd: string, timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const parts = cmd.split(' ').filter(Boolean);
    if (parts.length === 0) return resolve({ code: 1, stdout: '', stderr: 'empty command' });
    // if simple executable with args, prefer execFile
    if (/^[\w@.\-\/\\]+$/.test(parts[0])) {
      const child = execFile(parts[0], parts.slice(1), { cwd, env: { PATH: process.env.PATH || '' }, timeout: timeoutMs }, (err: any, stdout: any, stderr: any) => {
        if (err && (err as any).code === 'ENOENT') {
          // fallback to shell when executable not found (e.g. shell built-ins like echo)
          const sh = spawn(cmd, { cwd, env: { PATH: process.env.PATH || '' }, shell: true });
          let out = '';
          let er = '';
          sh.stdout?.on('data', (d) => out += d.toString());
          sh.stderr?.on('data', (d) => er += d.toString());
          let finished = false;
          const to = setTimeout(() => { try { sh.kill(); } catch(e){} }, timeoutMs);
          sh.on('close', (code) => { if (!finished) { finished = true; clearTimeout(to); resolve({ code, stdout: out, stderr: er }); } });
          sh.on('error', (e) => { if (!finished) { finished = true; clearTimeout(to); resolve({ code: 1, stdout: out, stderr: String(e) }); } });
          return;
        }
        if (err && (err as any).code && (err as any).signal === undefined) {
          resolve({ code: (err as any).code, stdout: stdout?.toString?.() || String(stdout), stderr: stderr?.toString?.() || String(stderr) });
        } else if (err) {
          resolve({ code: 1, stdout: stdout?.toString?.() || String(stdout), stderr: (err && err.message) || String(stderr) });
        } else {
          resolve({ code: 0, stdout: stdout?.toString?.() || String(stdout), stderr: stderr?.toString?.() || String(stderr) });
        }
      });
      return;
    }
    // fallback to shell spawn
    const child = spawn(cmd, { cwd, env: { PATH: process.env.PATH || '' }, shell: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => out += d.toString());
    child.stderr.on('data', (d) => err += d.toString());
    let finished = false;
    const to = setTimeout(() => { try { child.kill(); } catch(e){} }, timeoutMs);
    child.on('close', (code) => { if (!finished) { finished = true; clearTimeout(to); resolve({ code, stdout: out, stderr: err }); } });
    child.on('error', (e) => { if (!finished) { finished = true; clearTimeout(to); resolve({ code: 1, stdout: out, stderr: String(e) }); } });
  });
}

function suspicious(cmd: string) {
  // reject characters that allow shell expansions redirections or chaining
  return /[;&|<>$`]/.test(cmd);
}

function writeNpzMetadata(record: any) {
  try {
    const dir = path.join(process.cwd(), '.qflush', 'npz');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const idxPath = path.join(dir, 'index.json');
    let idx: any = {};
    if (fs.existsSync(idxPath)) {
      try { idx = JSON.parse(fs.readFileSync(idxPath, 'utf8') || '{}'); } catch { idx = {}; }
    }
    idx[record.id] = record;
    fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

export async function executeAction(action: string, ctx: any = {}): Promise<any> {
  const cfg = loadConfig();
  if (!action) return { success: false, error: 'empty' };

  try {
    if (action.startsWith('run ')) {
      const m = /run\s+"([^"]+)"(?:\s+in\s+"([^"]+)")?/.exec(action);
      if (!m) return { success: false, error: 'invalid run syntax' };
      const cmd = m[1];
      const dir = m[2] ? path.resolve(m[2]) : process.cwd();

      if (suspicious(cmd)) return { success: false, error: 'command contains suspicious characters' };

      // exact allowlist first
      if (cfg.allowedCommands && cfg.allowedCommands.length && !cfg.allowedCommands.includes(cmd)) {
        return { success: false, error: 'command not in allowedCommands' };
      }
      // fallback substring check
      const substrings = Array.isArray(cfg.allowedCommandSubstrings) ? cfg.allowedCommandSubstrings : [];
      const ok = substrings.some((s: string) => cmd.includes(s));
      if (!ok) return { success: false, error: 'command not allowed by policy' };

      if (ctx.dryRun) {
        return { success: true, dryRun: true, cmd };
      }

      const result = await safeExecFile(cmd, dir, cfg.commandTimeoutMs || 15000);
      const res = { success: result.code === 0, stdout: result.stdout, stderr: result.stderr, code: result.code };

      // webhook notify
      if (cfg.webhookUrl) {
        try { await fetch(cfg.webhookUrl, { method: 'POST', body: JSON.stringify({ action: cmd, path: ctx.path || null, result: res }), headers: { 'Content-Type': 'application/json' } }); } catch (e) {}
      }

      // persist execution history
      try { saveEngineHistory('exec-'+Date.now(), Date.now(), ctx.path || '', cmd, res); } catch (e) {}

      return res;
    }

    if (action.startsWith('npz.encode')) {
      const filePath = ctx.path || 'unknown';
      if (ctx.dryRun) {
        return { success: true, dryRun: true, note: 'would encode ' + filePath };
      }
      const id = 'npz-' + Math.random().toString(36).slice(2,10);
      const outDir = path.join(process.cwd(), '.qflush', 'npz');
      try { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
      const outFile = path.join(outDir, id + '.bin');
      // write a simple placeholder binary (could be real encoding later)
      try { fs.writeFileSync(outFile, Buffer.from(`encoded:${filePath}`)); } catch (e) {}

      const metadata = { id, source: filePath, createdAt: new Date().toISOString(), path: outFile };
      writeNpzMetadata(metadata);

      const res = { success: true, id, path: outFile, metadata };
      if (cfg.webhookUrl) { try { await fetch(cfg.webhookUrl, { method: 'POST', body: JSON.stringify({ action: 'npz.encode', path: filePath, result: res }), headers: { 'Content-Type': 'application/json' } }); } catch (e) {} }
      try { saveEngineHistory('npz-'+Date.now(), Date.now(), filePath, 'npz.encode', res); } catch (e) {}
      return res;
    }

    if (action.startsWith('daemon.reload')) {
      // trigger reload via daemon-control
      const ok = await callReload();
      const res = { success: ok };
      try { saveEngineHistory('reload-'+Date.now(), Date.now(), ctx.path || '', 'daemon.reload', res); } catch (e) {}
      return res;
    }

    return { success: false, error: 'unknown action' };
  } catch (e: any) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}
