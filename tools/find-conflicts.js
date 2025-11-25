#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

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

const root = process.cwd();
const src = path.join(root, 'src');
if (!fs.existsSync(src)) {
  console.error('src not found');
  process.exit(1);
}
const files = walk(src);
let found = false;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split(/\r?\n/);
  for (let i=0;i<lines.length;i++) {
    const L = lines[i];
    if (/^<<<<<<< |^>>>>>>> |^=======$/.test(L) || /^\+/.test(L)) {
      console.log(`${f}:${i+1}: ${L}`);
      found = true;
    }
  }
}
if (!found) console.log('No conflict markers found');
