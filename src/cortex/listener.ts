// Cortex listener: watch a folder for PNG packets and dispatch decoded JSON to executor
import * as fs from 'fs';
import * as path from 'path';
import { decodePNGsToPacket, parseCortexPacket } from './codec';
import { executeAction } from '../rome/executor';
import runSpyder from '../commands/spyder';

const WATCH_DIR = path.join(process.cwd(), 'canal');
const SPYDER_CFG = path.join(process.cwd(), '.qflush', 'spyder.config.json');

export function startCortexListener() {
  try {
    if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
  } catch (e) {}

  console.log('[CORTEX] listener watching', WATCH_DIR);

  const pending = new Set<string>();

  fs.watch(WATCH_DIR, { persistent: false }, async (ev, filename) => {
    if (!filename) return;
    const full = path.join(WATCH_DIR, filename);
    if (!filename.endsWith('.png')) return;
    if (pending.has(full)) return;
    pending.add(full);
    // give the file a moment to be fully written
    setTimeout(async () => {
      try {
        // find all matching parts for this prefix
        const prefix = filename.replace(/_part\d+\.png$/, '');
        const glob = fs.readdirSync(WATCH_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.png')).map(f => path.join(WATCH_DIR, f)).sort();
        if (!glob.length) {
          pending.delete(full);
          return;
        }
        const fullBuf = await decodePNGsToPacket(glob);
        const parsed = parseCortexPacket(fullBuf);
        // try to parse raw as JSON
        try {
          const txt = parsed.raw.toString('utf-8');
          const j = JSON.parse(txt);
          console.log('[CORTEX] packet received', j);
          // if the packet includes a cmd, route to executor or local handlers
          if (j && typeof j.cmd === 'string') {
            if (j.cmd === 'enable-spyder') {
              try {
                // ensure .qflush dir exists
                const cfgDir = path.dirname(SPYDER_CFG);
                if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
                // write a minimal spyder config enabling the service
                const cfg: any = {
                  enabled: true,
                  path: process.cwd(),
                  startCommand: Array.isArray(j.args) && j.args.length ? j.args : ['qflush'],
                  pidFile: path.join(process.cwd(), '.qflush', 'spyder.pid')
                };
                fs.writeFileSync(SPYDER_CFG, JSON.stringify(cfg, null, 2), 'utf8');
                console.log('[CORTEX] wrote spyder config to', SPYDER_CFG);
                // invoke runSpyder to start it (uses the config file)
                try {
                  const code = await runSpyder(['start']);
                  console.log('[CORTEX] runSpyder returned', code);
                } catch (e) {
                  console.warn('[CORTEX] runSpyder failed', e);
                }
              } catch (e) {
                console.warn('[CORTEX] enable-spyder handler failed', e);
              }
            } else {
              const action = `run \"echo unknown-cmd ${j.cmd}\"`;
              try {
                const res = await executeAction(action, { path: j.args && j.args[0] ? j.args[0] : '' });
                console.log('[CORTEX] executed', res);
              } catch (e) {
                console.warn('[CORTEX] execution failed', e);
              }
            }
          }
        } catch (e) {
          console.warn('[CORTEX] payload not JSON', e);
        }
      } catch (e) {
        console.warn('[CORTEX] decode failed', e);
      } finally {
        pending.delete(full);
      }
    }, 200);
  });
}
