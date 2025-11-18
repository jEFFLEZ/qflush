import fs from 'fs';
import path from 'path';

const STORE_DIR = path.join(process.cwd(), '.qflash');
const REQUEST_STORE = path.join(STORE_DIR, 'npz-requests.json');

type NpzRecord = {
  id: string;
  laneId?: number;
  ts: number;
  meta?: Record<string, any>;
};

let store: Record<string, NpzRecord> = {};

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
}

function load() {
  try {
    if (fs.existsSync(REQUEST_STORE)) {
      const raw = fs.readFileSync(REQUEST_STORE, 'utf8');
      store = JSON.parse(raw);
    }
  } catch (e) {}
}

function persist() {
  try {
    ensureDir();
    fs.writeFileSync(REQUEST_STORE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}
}

load();

export function createRequestRecord(id: string, meta?: Record<string, any>) {
  const rec: NpzRecord = { id, ts: Date.now(), meta };
  store[id] = rec;
  persist();
  return rec;
}

export function updateRequestRecord(id: string, patch: Partial<NpzRecord>) {
  if (!store[id]) return null;
  store[id] = { ...store[id], ...patch };
  persist();
  return store[id];
}

export function getRequestRecord(id: string) {
  return store[id] || null;
}

export default { createRequestRecord, updateRequestRecord, getRequestRecord };
