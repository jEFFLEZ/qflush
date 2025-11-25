#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;
  // replace `import path from 'path';` or `import path from "path";` and node:path variants
  src = src.replace(/import\s+path\s+from\s+['\"](?:node:)?path['\"];?/g, "import * as path from 'path';");
  if (src !== orig) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Fixed', file);
  }
}

const root = process.cwd();
const srcDir = path.join(root, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('src directory not found');
  process.exit(1);
}
const files = walk(srcDir);
for (const f of files) fixFile(f);
console.log('Done.');
