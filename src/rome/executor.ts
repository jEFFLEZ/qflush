import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { saveEngineHistory } from './storage';

const DEFAULT_CFG = { allowedCommandSubstrings: ['npm','node','echo'], allowedCommands: ['echo hello','npm run build'], commandTimeoutMs: 15000, webhookUrl: '' };

function loadConfig() {
  try {
    const p = path.join(process.cwd(), '.qflush', 'logic-config.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}
  return DEFAULT_CFG;
}

function spawnCommand(cmd: string, cwd: string, timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, env: process.env, shell: true });
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

      // exact allowlist first
      if (cfg.allowedCommands && cfg.allowedCommands.length && !cfg.allowedCommands.includes(cmd)) {
        return { success: false, error: 'command not in allowedCommands' };
      }
      // fallback substring check
      const ok = cfg.allowedCommandSubstrings.some((s: string) => cmd.includes(s));
      if (!ok) return { success: false, error: 'command not allowed by policy' };

      if (ctx.dryRun) {
        return { success: true, dryRun: true, cmd };
      }

      const result = await spawnCommand(cmd, dir, cfg.commandTimeoutMs || 15000);
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
      const res = { success: true, note: 'daemon.reload simulated' };
      if (cfg.webhookUrl) { try { await fetch(cfg.webhookUrl, { method: 'POST', body: JSON.stringify({ action: 'daemon.reload', result: res }), headers: { 'Content-Type': 'application/json' } }); } catch (e) {} }
      try { saveEngineHistory('reload-'+Date.now(), Date.now(), ctx.path || '', 'daemon.reload', res); } catch (e) {}
      return res;
    }

    return { success: false, error: 'unknown action' };
  } catch (e: any) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}
