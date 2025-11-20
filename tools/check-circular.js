#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Very simple circular import detector based on static string imports
const ROOT = process.cwd();
const visited = new Set();
const stack = [];
const graph = new Map();

function collectImports(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file,'utf8');
  const re = /import\s+(?:[^'";]+)\s+from\s+['"]([^'"]+)['"]/g;
  const res = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    res.push(m[1]);
  }
  return res;
}

function resolveModule(fromFile, mod) {
  if (mod.startsWith('.') || mod.startsWith('/')) {
    const base = path.dirname(fromFile);
    const resolved = path.resolve(base, mod);
    // try .ts, .js
    const cand = [resolved + '.ts', resolved + '.js', path.join(resolved,'index.ts'), path.join(resolved,'index.js')];
    for (const c of cand) if (fs.existsSync(c)) return path.relative(ROOT, c).replace(/\\/g,'/');
    return null;
  }
  // external module
  return null;
}

function buildGraph(dir) {
  const items = fs.readdirSync(dir);
  for (const it of items) {
    if (it === 'node_modules' || it === '.git') continue;
    const full = path.join(dir,it);
    const st = fs.statSync(full);
    if (st.isDirectory()) buildGraph(full);
    else {
      const ext = path.extname(it).toLowerCase();
      if (!['.ts','.js','.tsx','.jsx'].includes(ext)) continue;
      const rel = path.relative(ROOT, full).replace(/\\/g,'/');
      const imps = collectImports(full).map(i => resolveModule(full, i)).filter(Boolean);
      graph.set(rel, imps);
    }
  }
}

function detectCycles() {
  const cycles = [];
  const temp = new Set();
  const perm = new Set();

  function visit(n, pathStack) {
    if (perm.has(n)) return;
    if (temp.has(n)) {
      const idx = pathStack.indexOf(n);
      const cycle = pathStack.slice(idx).concat([n]);
      cycles.push(cycle);
      return;
    }
    temp.add(n);
    const neigh = graph.get(n) || [];
    for (const m of neigh) visit(m, pathStack.concat([n]));
    temp.delete(n);
    perm.add(n);
  }

  for (const k of graph.keys()) visit(k, []);
  return cycles;
}

buildGraph(path.join(ROOT, 'src'));
const cycles = detectCycles();
if (cycles.length) {
  console.warn('Circular dependencies detected:');
  for (const c of cycles) console.warn(' - ' + c.join(' -> '));
  process.exit(2);
}
console.log('No circular dependencies detected');
