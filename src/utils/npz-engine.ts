import { getNpzNamespace } from './npz-config';
import fs from 'fs';
import path from 'path';
import logger from './logger';
import { Lane } from './npz-router';

const NS = getNpzNamespace();
const ENGINE_FILE = path.join(process.cwd(), '.qflash', `${NS}-npz-engine.json`);

type ScoreRecord = {
  laneId: number;
  score: number; // lower is better
  lastSuccess?: number;
  lastFailure?: number;
};

type EngineStore = Record<number, ScoreRecord>;

let store: EngineStore = {};

function ensureDir() {
  const dir = path.dirname(ENGINE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    if (fs.existsSync(ENGINE_FILE)) {
      const raw = fs.readFileSync(ENGINE_FILE, 'utf8');
      store = JSON.parse(raw);
    }
  } catch (e) {
    store = {};
  }
}

function persist() {
  try {
    ensureDir();
    fs.writeFileSync(ENGINE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {}
}

load();

export function scoreLane(laneId: number, delta: number) {
  let rec = store[laneId];
  if (!rec) rec = { laneId, score: 0 };
  rec.score = (rec.score || 0) + delta;
  if (delta < 0) rec.lastSuccess = Date.now();
  if (delta > 0) rec.lastFailure = Date.now();
  store[laneId] = rec;
  persist();
}

export function getLaneScore(laneId: number) {
  return store[laneId]?.score ?? 0;
}

export function orderLanesByScore(lanes: Lane[]) {
  // return copy sorted by score asc
  const out = lanes.slice();
  out.sort((a, b) => getLaneScore(a.id) - getLaneScore(b.id));
  return out;
}

export function resetScores() {
  store = {};
  persist();
}

export default { scoreLane, getLaneScore, orderLanesByScore, resetScores };
