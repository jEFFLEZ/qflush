import fs from 'fs';
import path from 'path';

async function resolveFetch() {
  if (typeof (globalThis as any).fetch === 'function') return (globalThis as any).fetch;
  try {
    const m = await import('node-fetch');
    return (m && (m as any).default) || m;
  } catch (e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const undici = require('undici');
      if (undici && typeof undici.fetch === 'function') return undici.fetch;
    } catch (_) {}
  }
  throw new Error('No fetch implementation available (install node-fetch or undici)');
}

const CFG = path.join(process.cwd(), '.qflush', 'a11.config.json');

export function readConfig() {
  if (!fs.existsSync(CFG)) return null;
  try {
    return JSON.parse(fs.readFileSync(CFG, 'utf8'));
  } catch (e) { return null; }
}

async function fetchWithTimeout(url: string, opts: any = {}, timeoutMs: number = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fetch = await resolveFetch();
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function a11Chat(prompt: string, options?: { model?: string }) {
  const cfg = readConfig();
  if (!cfg || !cfg.enabled) throw new Error('A-11 not configured');
  const model = options?.model || cfg.defaultModel;
  const body = { model, messages: [{ role: 'user', content: prompt }], stream: false };
  const url = (cfg.serverUrl || 'http://127.0.0.1:3000').replace(/\/$/, '') + '/v1/chat';
  const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, cfg.timeoutMs || 60000);
  if (!res.ok) throw new Error('A-11 chat failed: ' + res.status);
  return res.json();
}

export async function a11Health() {
  const cfg = readConfig();
  if (!cfg) return { ok: false };
  const url = (cfg.serverUrl || 'http://127.0.0.1:3000').replace(/\/$/, '') + '/v1/health';
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' }, cfg.timeoutMs || 60000);
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (e) { return { ok: false, error: String(e) }; }
}
