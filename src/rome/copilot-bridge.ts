import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import { CopilotConfig, TelemetryEvent, EngineState, RuleEvent, Diagnostic } from './copilot-types';
import { saveTelemetryEvent } from './storage';

const DEFAULT_CONFIG: CopilotConfig = {
  enabled: false,
  telemetryVersion: 1,
  transports: ['file'],
  filePath: '.qflush/telemetry.json',
  allowedData: ['engineState','ruleEvent','diagnostic','contextSnapshot'],
  samplingRate: 1.0,
  maxPayloadSize: 200000
};

let cfg: CopilotConfig = DEFAULT_CONFIG;
const emitter = new EventEmitter();

function loadCfg() {
  try {
    const p = path.join(process.cwd(), '.qflush', 'copilot.json');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      cfg = Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
    }
  } catch (e) {
    // ignore
  }
}

function signPayload(payload: string): string | null {
  try {
    if (!cfg.hmacSecretEnv) return null;
    const secret = process.env[cfg.hmacSecretEnv || ''];
    if (!secret) return null;
    const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return h;
  } catch (e) { return null; }
}

async function sendWebhook(event: TelemetryEvent) {
  if (!cfg.webhookUrl) return;
  try {
    const payload = JSON.stringify(event);
    const headers: any = { 'Content-Type': 'application/json' };
    const sig = signPayload(payload);
    if (sig) headers['X-Copilot-Signature'] = `sha256=${sig}`;
    await fetch(cfg.webhookUrl, { method: 'POST', body: payload, headers });
  } catch (e) {
    // best-effort
  }
}

function writeFileEvent(event: TelemetryEvent) {
  try {
    const p = path.join(process.cwd(), cfg.filePath || '.qflush/telemetry.json');
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = p + '.tmp';
    const arr = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8') || '[]') : [];
    arr.push(event);
    fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch (e) {
    // ignore
  }
}

export function initCopilotBridge() {
  loadCfg();
  if (!cfg.enabled) return;
}

export async function emitEngineState(state: EngineState) {
  if (!cfg.enabled) return;
  const ev: TelemetryEvent = { type: 'engine_state', telemetryVersion: cfg.telemetryVersion, timestamp: new Date().toISOString(), payload: state };
  if (cfg.transports.includes('webhook')) await sendWebhook(ev);
  if (cfg.transports.includes('file')) writeFileEvent(ev);
  try { saveTelemetryEvent('engine-'+Date.now(), 'engine_state', Date.now(), state); } catch (e) {}
  emitter.emit('telemetry', ev);
}

export async function emitRuleEvent(ev: RuleEvent) {
  if (!cfg.enabled) return;
  const event: TelemetryEvent = { type: 'rule_event', telemetryVersion: cfg.telemetryVersion, timestamp: new Date().toISOString(), payload: ev };
  if (cfg.transports.includes('webhook')) await sendWebhook(event);
  if (cfg.transports.includes('file')) writeFileEvent(event);
  try { saveTelemetryEvent('rule-'+Date.now(), 'rule_event', Date.now(), ev); } catch (e) {}
  emitter.emit('telemetry', event);
}

export async function emitDiagnostic(diag: Diagnostic) {
  if (!cfg.enabled) return;
  const event: TelemetryEvent = { type: 'diagnostic', telemetryVersion: cfg.telemetryVersion, timestamp: new Date().toISOString(), payload: diag };
  if (cfg.transports.includes('webhook')) await sendWebhook(event);
  if (cfg.transports.includes('file')) writeFileEvent(event);
  try { saveTelemetryEvent('diag-'+Date.now(), 'diagnostic', Date.now(), diag); } catch (e) {}
  emitter.emit('telemetry', event);
}

export function _signPayloadForTest(payload: string, secret: string) {
  try {
    const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return h;
  } catch (e) { return null; }
}

export function onTelemetry(cb: (ev: TelemetryEvent)=>void) { emitter.on('telemetry', cb); }

export function shutdownCopilotBridge() { /* placeholder for flush */ }

export function getConfig() { return cfg; }
