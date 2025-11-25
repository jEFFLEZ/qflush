import fs from 'fs';
import path from 'path';

// Try to import a11 client if present (will be used only when explicitly requested)
let a11: any = null;
try {
  a11 = require('../src/core/a11Client');
} catch (e) {
  try { a11 = require('../dist/core/a11Client'); } catch (_e) { a11 = null; }
}

async function decodeOC8Buffer(buf: Buffer): Promise<any> {
  // placeholder: if project has decode logic, require it at runtime
  try {
    const v = require('../dist/daemon/qflushd');
    return null;
  } catch (e) {
    return null;
  }
}

async function applyRulesToProject(rules: any, useA11: boolean) {
  // ensure directories exist
  const arch = rules.architecture || {};
  for (const k of Object.keys(arch)) {
    const p = path.join(process.cwd(), arch[k]);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }

  // Example: add a note file in src/core
  const note = path.join(process.cwd(), 'src', 'core', 'FUNESTERIE_NOTICE.md');
  fs.writeFileSync(note, '# Funesterie core area\n\nManaged by refactor-funesterie script.');

  // A-11 integration is optional. Only call if explicitly requested and available.
  if (useA11 && a11 && a11.a11Health) {
    try {
      const health = await a11.a11Health();
      if (health && health.ok) {
        console.log('[FUNESTERIE] A-11 available — requesting guidance');
        try {
          const prompt = `You are A-11. Given these refactor rules: ${JSON.stringify(rules)}\nProvide a short plan of 5 steps to apply.`;
          const resp = await a11.a11Chat(prompt, { model: rules.defaultModel });
          console.log('[FUNESTERIE][A-11] Suggestion:', JSON.stringify(resp, null, 2));
        } catch (e) {
          console.warn('[FUNESTERIE] A-11 chat failed', e);
        }
      } else {
        console.log('[FUNESTERIE] A-11 not healthy or unavailable', health);
      }
    } catch (e) {
      console.warn('[FUNESTERIE] a11Health check failed', e);
    }
  } else if (useA11) {
    console.log('[FUNESTERIE] A-11 requested but client not present');
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const rulesPath = args.find(a => !a.startsWith('--')) ?? '.qflush/funesterie.rules.json';
    const useA11 = args.includes('--use-a11') || process.env.FUNESTERIE_USE_A11 === '1';

    // Debugging aids: log cwd and rules path so CI logs show where we look
    console.log('[FUNESTERIE] cwd=', process.cwd());
    console.log('[FUNESTERIE] requested rulesPath=', rulesPath);

    if (!fs.existsSync(rulesPath)) {
      console.warn('[FUNESTERIE] rules file not found at', rulesPath);
    } else {
      try {
        const stat = fs.statSync(rulesPath);
        console.log('[FUNESTERIE] rules file size=', stat.size);
        const sample = fs.readFileSync(rulesPath, 'utf8');
        console.log('[FUNESTERIE] rules file preview:\n', sample.substring(0, 1200));
      } catch (e) {
        console.warn('[FUNESTERIE] failed to read rules file for preview', e);
      }
    }

    let raw = fs.readFileSync(rulesPath);
    let rules: any;
    if (rulesPath.endsWith('.png')) {
      rules = await decodeOC8Buffer(raw);
    } else {
      rules = JSON.parse(raw.toString('utf8'));
    }
    console.log('[FUNESTERIE] Loaded rules v' + rules.version);
    await applyRulesToProject(rules, useA11);
    console.log('[FUNESTERIE] Refactor done');
  } catch (e) {
    console.error('[FUNESTERIE] failed', e);
    process.exit(1);
  }
}

main();
