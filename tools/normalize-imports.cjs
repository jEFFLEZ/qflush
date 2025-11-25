#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir){
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const it of entries){
    const full = path.join(dir, it.name);
    if(it.isDirectory()) out.push(...walk(full));
    else if(it.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const root = process.cwd();
const src = path.join(root, 'src');
if(!fs.existsSync(src)){ console.error('src not found'); process.exit(1); }
const files = walk(src);
let changed = 0;
for(const f of files){
  let txt = fs.readFileSync(f,'utf8');
  const orig = txt;
  // add .js extension on local relative imports when importing a sibling ts file
  txt = txt.replace(/(from\s+)(['"])(\.\.?\/(?:[^'"\\]+\/)*[^'"\\]+)(['"])/g, (m, pre, q, rel, q2) => {
    // if already has an extension, leave as-is
    if (/\.[tj]s$/.test(rel)) return pre + q + rel + q2;
    // check if corresponding .ts or index.ts exists relative to importing file
    const candidateTs = path.resolve(path.dirname(f), rel + '.ts');
    const candidateIndexTs = path.resolve(path.dirname(f), rel, 'index.ts');
    if (fs.existsSync(candidateTs) || fs.existsSync(candidateIndexTs)) {
      return pre + q + rel + '.js' + q2;
    }
    return pre + q + rel + q2;
  });

  // normalize node:net default import to namespace import
  txt = txt.replace(/import\s+net\s+from\s+['"]node:net['"];?/g, "import * as net from 'node:net';");
  // normalize node:path default import to namespace import
  txt = txt.replace(/import\s+path\s+from\s+['"]node:path['"];?/g, "import * as path from 'path';");
  // also handle import path from 'path'
  txt = txt.replace(/import\s+path\s+from\s+['"]path['"];?/g, "import * as path from 'path';");

  if(txt !== orig){ fs.writeFileSync(f, txt, 'utf8'); changed++; console.log('Updated', f); }
}
console.log('Done. Files updated:', changed);
