import * as fs from 'fs';
import * as path from 'path';
import { CortexPacket } from './types';
import { executeAction } from '../rome/executor';

const QFLUSH_DIR = path.join(process.cwd(), '.qflush');
const CACHE_PATH = path.join(QFLUSH_DIR, 'spyder.cache.json');
const PATCHES_DIR = path.join(QFLUSH_DIR, 'patches');
const PATCH_AUDIT = path.join(PATCHES_DIR, 'audit.log');

function loadCache(): { appliedIds: string[] } {
  try {
    if (!fs.existsSync(CACHE_PATH)) return { appliedIds: [] };
    const raw = fs.readFileSync(CACHE_PATH, 'utf8') || '{}';
    const obj = JSON.parse(raw);
    return { appliedIds: Array.isArray(obj.appliedIds) ? obj.appliedIds : [] };
  } catch (e) {
    return { appliedIds: [] };
  }
}

function saveCache(cache: { appliedIds: string[] }) {
  try {
    if (!fs.existsSync(QFLUSH_DIR)) fs.mkdirSync(QFLUSH_DIR, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

function ensurePatchesDir() {
  try { if (!fs.existsSync(PATCHES_DIR)) fs.mkdirSync(PATCHES_DIR, { recursive: true }); } catch (e) {}
}

function appendPatchAudit(entry: any) {
  try {
    ensurePatchesDir();
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(PATCH_AUDIT, line, 'utf8');
  } catch (e) { /* ignore */ }
}

function loadPatchWhitelist(): string[] {
  try {
    const wlFile = path.join(PATCHES_DIR, 'whitelist.json');
    if (fs.existsSync(wlFile)) {
      const raw = fs.readFileSync(wlFile, 'utf8') || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(String);
    }
  } catch (e) {}
  // default whitelist: allow only top-level keys considered safe
  return ['routes', 'spyder', 'npz', 'telemetry', 'logic-config'];
}

function isPatchAllowed(patch: any): { ok: boolean; reason?: string } {
  try {
    if (!patch || typeof patch !== 'object') return { ok: false, reason: 'invalid_patch' };
    const whitelist = loadPatchWhitelist();
    const keys = Object.keys(patch);
    // allow when every key is in whitelist
    for (const k of keys) {
      if (!whitelist.includes(k)) return { ok: false, reason: `key_not_allowed:${k}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'validation_error' };
  }
}

export async function applyCortexPacket(packet: CortexPacket): Promise<void> {
  // dedupe by id
  try {
    const cache = loadCache();
    if (packet.id && cache.appliedIds.includes(packet.id)) {
      console.log('[APPLY] packet already applied (id=', packet.id, ') — skipping');
      return;
    }

    switch (packet.type) {
      case 'enable-spyder':
        await applyEnableSpyder(packet);
        break;

      case 'cortex:routes':
        await applyCortexRoutes(packet);
        break;

      case 'qflush:apply':
        await applyQflushConfigPatch(packet);
        break;

      case 'NPZ-GRAPH':
      case 'npz-graph':
      case 'npz:graph':
        await applyNpzGraph(packet);
        break;

      case 'SAVE-STATE':
      case 'save-state':
      case 'save:state':
        await applySaveState(packet);
        break;

      case 'AUTO-PATCH':
      case 'auto-patch':
      case 'qflush:auto-patch':
        await applyAutoPatch(packet);
        break;

      default:
        console.warn('[APPLY] Type de packet non géré:', packet.type);
    }

    // record applied id
    try {
      if (packet.id) {
        const cache2 = loadCache();
        cache2.appliedIds.push(packet.id);
        // keep unique
        cache2.appliedIds = Array.from(new Set(cache2.appliedIds));
        saveCache(cache2);
      }
    } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('[APPLY] applyCortexPacket failed:', String(e));
  }
}

async function applyNpzGraph(packet: CortexPacket) {
  try {
    const payload: any = packet.payload || {};
    const filePath = payload && payload.path ? String(payload.path) : process.cwd();
    console.log('[APPLY] NPZ-GRAPH ingest for', filePath);
    const res = await executeAction('npz.encode', { path: filePath });
    console.log('[APPLY] NPZ-GRAPH result', res);
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'npz.encode', path: filePath, result: res, when: new Date().toISOString() });
  } catch (e) {
    console.warn('[APPLY] NPZ-GRAPH failed', String(e));
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'npz.encode', error: String(e), when: new Date().toISOString() });
  }
}

async function applySaveState(packet: CortexPacket) {
  try {
    if (!fs.existsSync(QFLUSH_DIR)) fs.mkdirSync(QFLUSH_DIR, { recursive: true });
    const stateFile = path.join(QFLUSH_DIR, 'state.json');
    const snapshotDir = path.join(QFLUSH_DIR, 'snapshots');
    if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = path.join(snapshotDir, `state-${now}.json`);

    // read current state if exists or create minimal
    let current: any = {};
    try { if (fs.existsSync(stateFile)) current = JSON.parse(fs.readFileSync(stateFile, 'utf8') || '{}'); } catch (e) { current = {}; }

    // allow packet.payload to merge into state snapshot
    const payload: any = packet.payload || {};
    const merged = { ...current, ...payload };
    fs.writeFileSync(snapshotFile, JSON.stringify(merged, null, 2), 'utf8');
    // also write state.json as current
    fs.writeFileSync(stateFile, JSON.stringify(merged, null, 2), 'utf8');

    console.log('[APPLY] SAVE-STATE snapshot written to', snapshotFile);
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'save-state', path: snapshotFile, when: new Date().toISOString() });
  } catch (e) {
    console.warn('[APPLY] SAVE-STATE failed', String(e));
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'save-state', error: String(e), when: new Date().toISOString() });
  }
}

async function applyAutoPatch(packet: CortexPacket) {
  try {
    const payload: any = packet.payload || {};
    const patch = payload.patch || payload;
    const approve = Boolean(payload.approve || payload.approved || false);
    const dryRun = Boolean(payload.dryRun || payload.dry || false);

    // validate patch keys
    const validation = isPatchAllowed(patch);
    if (!validation.ok) {
      // write blocked patch for audit
      try {
        ensurePatchesDir();
        const blockedFile = path.join(PATCHES_DIR, `blocked-${packet.id || Date.now()}.json`);
        fs.writeFileSync(blockedFile, JSON.stringify({ packetId: packet.id || null, reason: validation.reason, patch }, null, 2), 'utf8');
        appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'auto-patch', status: 'blocked', reason: validation.reason, when: new Date().toISOString() });
      } catch (e) {}
      console.warn('[APPLY] AUTO-PATCH blocked by whitelist:', validation.reason);
      return;
    }

    const dir = QFLUSH_DIR;
    const cfgFile = path.join(dir, 'config.json');
    let current: any = {};
    try { if (fs.existsSync(cfgFile)) current = JSON.parse(fs.readFileSync(cfgFile, 'utf8') || '{}'); } catch (e) { current = {}; }

    const merged = { ...current, ...patch };

    if (dryRun || !approve) {
      const outDir = path.join(dir, 'patches');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `dryrun-${packet.id || Date.now()}.json`);
      fs.writeFileSync(outFile, JSON.stringify({ current, patch, merged }, null, 2), 'utf8');
      appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'auto-patch', status: 'dryrun', file: outFile, when: new Date().toISOString() });
      console.log('[APPLY] AUTO-PATCH dry-run saved to', outFile);
      if (approve) {
        // fallthrough to apply
      } else {
        return;
      }
    }

    // apply
    fs.writeFileSync(cfgFile, JSON.stringify(merged, null, 2), 'utf8');
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'auto-patch', status: 'applied', file: cfgFile, when: new Date().toISOString() });
    console.log('[APPLY] AUTO-PATCH applied to', cfgFile);
  } catch (e) {
    console.warn('[APPLY] AUTO-PATCH failed', String(e));
    appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'auto-patch', status: 'error', error: String(e), when: new Date().toISOString() });
  }
}

// existing handlers
async function applyEnableSpyder(packet: CortexPacket) {
  const dir = path.join(process.cwd(), '.qflush');
  const file = path.join(dir, 'spyder.config.json');
  const current = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {};

  const payload: any = packet.payload ?? {};
  const spyderConfig = {
    ...current,
    ...(payload.spyder || {})
  };

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(spyderConfig, null, 2), 'utf8');
  console.log('[APPLY] SPYDER mis à jour via packet enable-spyder');
  appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'enable-spyder', when: new Date().toISOString() });
}

async function applyCortexRoutes(packet: CortexPacket) {
  const dir = path.join(process.cwd(), '.qflush');
  const file = path.join(dir, 'cortex.routes.json');
  const payload: any = packet.payload ?? {};

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  console.log('[APPLY] cortex.routes.json mis à jour.');
  appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'cortex:routes', when: new Date().toISOString() });
}

async function applyQflushConfigPatch(packet: CortexPacket) {
  const dir = path.join(process.cwd(), '.qflush');
  const file = path.join(dir, 'config.json');
  const current = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {};

  const payload: any = packet.payload ?? {};
  const merged = {
    ...current,
    ...payload
  };

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf8');
  console.log('[APPLY] config.json mis à jour via packet qflush:apply');
  appendPatchAudit({ id: packet.id || null, type: packet.type, action: 'qflush:apply', when: new Date().toISOString() });
}

export default { applyCortexPacket };
