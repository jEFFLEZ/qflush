#!/usr/bin/env node
// Script: fix-utils-imports.js
// Replace imports using @utils/* alias with relative imports pointing to src/utils/*

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_DIRS = ['src/utils', 'src/commands'];
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS;

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

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function replaceInFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  // regex to find imports from @utils/<name>
  const re = /from\s+['"]@utils\/(.*?)['"];?/g;
  let changed = false;
  src = src.replace(re, (m, localName) => {
    // compute target file under src/utils/
    const target = path.join(ROOT, 'src', 'utils', localName);
    // compute relative path from file dir
    let rel = path.relative(dir, target);
    rel = toPosix(rel);
    if (!rel.startsWith('.')) rel = './' + rel;
    // remove extension if present
    rel = rel.replace(/\.(ts|js)$/, '');
    changed = true;
    return `from '${rel}'`;
  });

  // also handle imports like "@utils" root -> src/utils/index
  src = src.replace(/from\s+['"]@utils['"];?/g, (m) => {
    const target = path.join(ROOT, 'src', 'utils');
    let rel = path.relative(dir, target);
    rel = toPosix(rel);
    if (!rel.startsWith('.')) rel = './' + rel;
    rel = rel.replace(/\.(ts|js)$/, '');
    changed = true;
    return `from '${rel}'`;
  });

  if (changed) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Fixed imports in', file);
  }
}

for (const d of dirs) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  const files = walk(abs);
  for (const f of files) replaceInFile(f);
}

console.log('Done.');
