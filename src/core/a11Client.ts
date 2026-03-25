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

function normalizeBase(url?: string) {
  return String(url || '').replace(/\/$/, '');
}

function resolveServerBase(cfg: any) {
  return normalizeBase(
    process.env.A11_SERVER_URL ||
    process.env.QFLUSH_URL ||
    cfg?.serverUrl ||
    'http://127.0.0.1:3000'
  );
}

async function fetchJsonWithFallback(base: string, paths: string[], body: any, timeoutMs: number) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let lastStatus = 0;
    for (const p of paths) {
      const url = base + p;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      } as any);
      if (res.ok) return await res.json();
      lastStatus = res.status;
      if (res.status !== 404 && res.status !== 403) {
        throw new Error('A-11 chat failed: ' + res.status + ' on ' + url);
      }
    }
    throw new Error('A-11 chat failed: ' + lastStatus);
  } finally {
    clearTimeout(to);
  }
}

export async function a11Chat(prompt: string, options?: { model?: string }) {
  const cfg = readConfig();
  if (cfg && cfg.enabled === false) throw new Error('A-11 not configured');
  const model = options?.model || cfg.defaultModel;
  const body = { model, messages: [{ role: 'user', content: prompt }], stream: false };
  const base = resolveServerBase(cfg);

  const timeoutMs = Number(cfg.timeoutMs) || 60000;
  return await fetchJsonWithFallback(base, ['/api/chat/completions', '/v1/chat/completions', '/v1/chat'], body, timeoutMs);
}

export async function a11Health() {
  const cfg = readConfig();
  const base = resolveServerBase(cfg);
  const timeoutMs = Number(cfg.timeoutMs) || 60000;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const p of ['/health', '/v1/health']) {
      const url = base + p;
      const res = await fetch(url, { method: 'GET', signal: controller.signal } as any);
      const text = await res.text();
      if (res.ok) return { ok: true, status: res.status, text, url };
      if (res.status !== 404 && res.status !== 403) return { ok: false, status: res.status, text, url };
    }
    return { ok: false, status: 404, text: 'health endpoint not found' };
  } catch (e) { return { ok: false, error: String(e) }; } finally {
    clearTimeout(to);
  }
}
