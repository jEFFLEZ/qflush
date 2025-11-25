#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function walk(dir){
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for(const it of items){
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
let changedCount = 0;
for(const f of files){
  let txt = fs.readFileSync(f, 'utf8');
  const orig = txt;
  // remove lines that are only plus signs (conflict residue)
  txt = txt.split(/\r?\n/).filter(l => !/^\s*\+{1,}\s*$/.test(l)).join('\n');
  if(txt !== orig){ fs.writeFileSync(f, txt, 'utf8'); console.log('Fixed', f); changedCount++; }
}
console.log('Done. Files changed:', changedCount);
