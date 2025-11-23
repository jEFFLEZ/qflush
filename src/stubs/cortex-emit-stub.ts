export function cortexEmit(event: string, payload: any) {
  // minimal stub: write to .qflush/cortex/drip.log
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(process.cwd(), '.qflush', 'cortex');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, 'drip.log');
    fs.appendFileSync(p, JSON.stringify({ t: new Date().toISOString(), event, payload }) + '\n', 'utf8');
  } catch (e) {}
}

export function onCortexEvent(ev: string, cb: any) {
  // no-op
}

export default { cortexEmit, onCortexEvent };
