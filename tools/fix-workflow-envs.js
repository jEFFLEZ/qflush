const fs = require('fs');
const path = require('path');

const wfDir = path.join(process.cwd(), '.github', 'workflows');
if (!fs.existsSync(wfDir)) {
  console.error('workflows dir not found');
  process.exit(1);
}

const files = fs.readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
let changed = 0;
for (const f of files) {
  const p = path.join(wfDir, f);
  let src = fs.readFileSync(p, 'utf8');
  // Normalize CRLF
  src = src.replace(/\r\n/g, '\n');
  // Simple state machine: when in a line that is exactly 'env:' record indent and quote values until indent decreases or blank line
  const lines = src.split('\n');
  const out = [];
  let inEnv = false;
  let envIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)env:\s*$/);
    if (m) {
      inEnv = true;
      envIndent = m[1].length;
      out.push(line);
      continue;
    }
    if (inEnv) {
      // check indent
      const indentMatch = line.match(/^(\s*)([^\s].*)$/);
      if (!indentMatch) {
        // blank or fully whitespace - keep and continue
        out.push(line);
        continue;
      }
      const indent = indentMatch[1].length;
      if (indent <= envIndent) {
        // left env block
        inEnv = false;
        out.push(line);
        continue;
      }
      // now process potential key: value
      const kv = line.match(/^(\s*)([A-Za-z0-9_\-]+):\s*(.*)$/);
      if (kv) {
        const keyIndent = kv[1];
        const key = kv[2];
        let val = kv[3];
        // if value is already quoted or empty or starts with ${{ keep as is
        const trimmed = val.trim();
        if (trimmed === '' || /^['"].*['"]$/.test(trimmed) || /^\${\{/.test(trimmed) || /^\[/.test(trimmed) || /^\{/.test(trimmed)) {
          out.push(line);
        } else {
          // quote the value safely: escape single quotes by doubling
          const q = trimmed.replace(/'/g, "''");
          out.push(`${keyIndent}${key}: '${q}'`);
          if (val !== trimmed) {
            // preserve trailing comments/spaces? skip for simplicity
          }
        }
      } else {
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  const res = out.join('\n');
  if (res !== src) {
    fs.writeFileSync(p, res, 'utf8');
    console.log('Patched', f);
    changed++;
  }
}
console.log('Done. files changed:', changed);
