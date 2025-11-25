#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function walk(dir){
  const out = [];
  for(const it of fs.readdirSync(dir, { withFileTypes: true })){
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
const patterns = [
  /import\s+path\s+from\s+['"]([^'"]+)['"]/g,
  /import\s+path\s+from\s+['"]node:([^'"]+)['"]/g,
  /\+{1,}/g,
  /loadScanner\.js/g,
];
let found=false;
for(const f of files){
  const txt = fs.readFileSync(f, 'utf8');
  for(const p of patterns){
    let m;
    p.lastIndex = 0;
    while((m = p.exec(txt)) !== null){
      console.log(`${f}:${m.index + 1}:${p} => ${m[0].slice(0,80).replace(/\n/g,' ')}${m[0].length>80?'...':''}`);
      found=true;
    }
  }
}
if(!found) console.log('No matches');
