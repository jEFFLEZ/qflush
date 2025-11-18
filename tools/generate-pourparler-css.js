const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const src = path.join(__dirname, '..', 'src', 'utils', 'npz-pourparler.ts');
const outDir = path.join(__dirname, '..', 'extensions', 'vscode-npz');
const outFile = path.join(outDir, 'pourparler-checksum.css');

if (!fs.existsSync(src)) {
  console.error('source not found', src);
  process.exit(1);
}
const data = fs.readFileSync(src, 'utf8');
const hash = crypto.createHash('sha256').update(data).digest('hex');
const css = `/* npz-pourparler checksum: ${hash} */\n:root { --npz-pourparler-checksum: '${hash}'; }\n`;
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, css, 'utf8');
console.log('wrote', outFile, hash);
