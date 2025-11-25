#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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

function fileExistsJsCandidate(base, rel) {
  // given importing file base and rel path (./foo/bar), check if base/rel.ts exists or base/rel/index.ts exists
  const cand1 = path.resolve(path.dirname(base), rel + '.ts');
  const cand2 = path.resolve(path.dirname(base), rel, 'index.ts');
  return fs.existsSync(cand1) || fs.existsSync(cand2);
}

const root = process.cwd();
const src = path.join(root, 'src');
if (!fs.existsSync(src)) { console.error('src not found'); process.exit(1); }
const files = walk(src);
let changed = 0;
for (const f of files) {
  let srcTxt = fs.readFileSync(f, 'utf8');
  const orig = srcTxt;
  // replace import ... from 'relative' where relative starts with ./ or ../ and has no extension
  srcTxt = srcTxt.replace(/(import\s+[\s\S]+?from\s+)(['"])(\.\.?(?:[^'"\\]+\/)*[^'"\\]+)(['"];?)/g, (m, pre, q, rel, q2) => {
    // if already has extension, leave
    if (/\.[tj]s$/.test(rel)) return m;
    // if it's a path like ./something and corresponding .ts exists, append .js
    if (fileExistsJsCandidate(f, rel)) {
      return pre + q + rel + '.js' + q2;
    }
    return m;
  });

  if (srcTxt !== orig) {
    fs.writeFileSync(f, srcTxt, 'utf8');
    console.log('Updated', f);
    changed++;
  }
}
console.log('Done. Files updated:', changed);
