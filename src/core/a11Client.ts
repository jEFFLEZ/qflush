import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const CFG = path.join(process.cwd(), '.qflush', 'a11.config.json');

export function readConfig() {
  if (!fs.existsSync(CFG)) return null;
  try {
    return JSON.parse(fs.readFileSync(CFG, 'utf8'));
  } catch (e) { return null; }
}

export async function a11Chat(prompt: string, options?: { model?: string }) {
  const cfg = readConfig();
  if (!cfg || !cfg.enabled) throw new Error('A-11 not configured');
  const model = options?.model || cfg.defaultModel;
  const body = { model, messages: [{ role: 'user', content: prompt }], stream: false };
  const url = (cfg.serverUrl || 'http://127.0.0.1:3000').replace(/\/$/, '') + '/v1/chat';
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeout: cfg.timeoutMs || 60000 });
  if (!res.ok) throw new Error('A-11 chat failed: ' + res.status);
  return res.json();
}

export async function a11Health() {
  const cfg = readConfig();
  if (!cfg) return { ok: false };
  const url = (cfg.serverUrl || 'http://127.0.0.1:3000').replace(/\/$/, '') + '/v1/health';
  try {
    const res = await fetch(url, { method: 'GET', timeout: cfg.timeoutMs || 60000 });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (e) { return { ok: false, error: String(e) }; }
}
