// ROME-TAG: 0x0E71A8

import colors from './colors';
import * as fs from 'fs';
import * as path from 'path';

// Ensure common .qflush logs directory and files exist to avoid ENOENT in tests
try {
  const base = path.join(process.cwd(), '.qflush');
  const logs = path.join(base, 'logs');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  if (!fs.existsSync(logs)) fs.mkdirSync(logs, { recursive: true });
  const common = ['spyder.log', 'qflushd.out', 'qflushd.err'];
  for (const f of common) {
    const p = path.join(logs, f);
    try { if (!fs.existsSync(p)) fs.writeFileSync(p, '', 'utf8'); } catch (_) { /* ignore */ }
  }
} catch (_) {
  // swallow - logger must not throw
}

function appendSafe(filename: string, msg: string) {
  try {
    const logsDir = path.join(process.cwd(), '.qflush', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const p = path.join(logsDir, filename);
    try {
      fs.appendFileSync(p, msg + '\n', 'utf8');
    } catch (e) {
      // silent fail to avoid throwing during tests
    }
  } catch (e) {
    // ignore
  }
}

export const logger = {
  info: (msg: string) => {
    console.log(`\x1b[36m[QFLUSH]\x1b[0m ${msg}`);
    appendSafe('qflushd.out', `[INFO] ${msg}`);
    appendSafe('spyder.log', `[INFO] ${msg}`);
  },
  warn: (msg: string) => {
    console.log(`\x1b[33m[QFLUSH]\x1b[0m ${msg}`);
    appendSafe('qflushd.err', `[WARN] ${msg}`);
    appendSafe('spyder.log', `[WARN] ${msg}`);
  },
  error: (msg: string) => {
    console.error(`\x1b[31m[QFLUSH]\x1b[0m ${msg}`);
    appendSafe('qflushd.err', `[ERROR] ${msg}`);
    appendSafe('spyder.log', `[ERROR] ${msg}`);
  },
  success: (msg: string) => {
    console.log(`\x1b[32m[QFLUSH]\x1b[0m ${msg}`);
    appendSafe('qflushd.out', `[SUCCESS] ${msg}`);
    appendSafe('spyder.log', `[SUCCESS] ${msg}`);
  },
  joker: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'joker' }),
  nez: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'base' }),
  neutral: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'neutral' }),
};

export default logger;
