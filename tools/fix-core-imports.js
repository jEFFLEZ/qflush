#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
if (!fs.existsSync(SRC)) {
  console.error('src not found');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full));
    else if (it.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const CORE = ['fs','path','net','http','https','os','child_process','crypto'];
let changed = 0;
for (const f of files) {
  let txt = fs.readFileSync(f,'utf8');
  const orig = txt;
  for (const m of CORE) {
    // replace default import like: import fs from 'fs'; or import fs from "fs";
    const re = new RegExp(`import\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s+from\\s+['\"](?:node:)?${m}['\"];?`, 'g');
    txt = txt.replace(re, (match, p1) => {
      // skip if it's already a namespace import
      if (match.includes('* as')) return match;
      return `import * as ${p1} from '${m}';`;
    });
    // also normalize import path from 'path' to namespace import for patterns like: import path from 'path';
    const reNode = new RegExp(`import\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s+from\\s+['\"]node:${m}['\"];?`, 'g');
    txt = txt.replace(reNode, (match, p1) => `import * as ${p1} from '${m}';`);
  }

  if (txt !== orig) {
    fs.writeFileSync(f, txt, 'utf8');
    console.log('Updated', f);
    changed++;
  }
}
console.log('Done. Files updated:', changed);
