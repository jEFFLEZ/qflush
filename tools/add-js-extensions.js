#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(full));
    else if (e.isFile() && full.endsWith('.ts')) files.push(full);
  }
  return files;
}

function addExtensionToRel(rel) {
  if (/\.[tj]s$|\.json$/.test(rel)) return rel;
  if (/\/index$/.test(rel)) return rel + '.js';
  return rel + '.js';
}

async function fixFile(file) {
  let src = await fs.readFile(file, 'utf8');
  const orig = src;
  src = src.replace(/(from\s+|import\()(['"])(\.{1,2}\/[^'"\)]+)\2/g, (m, p1, quote, rel) => {
    return p1 + quote + addExtensionToRel(rel) + quote;
  });
  if (src !== orig) {
    await fs.writeFile(file, src, 'utf8');
    console.log('Patched', file);
  }
}

(async function main(){
  const ROOT = path.join(__dirname, '..');
  const SRC = path.join(ROOT, 'src');
  const files = await walk(SRC);
  for (const f of files) await fixFile(f);
  console.log('Done');
})();
