const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const src = path.join(__dirname, '..', 'src', 'utils', 'npz-pourparler.ts');
const outDir = path.join(__dirname, '..', 'extensions', 'vscode-npz');
const outFile = path.join(outDir, 'pourparler-checksum.css');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(src)) {
  console.warn('source not found, writing placeholder checksum', src);
  const placeholder = '0000000000000000000000000000000000000000000000000000000000000000';
  const css = `/* npz-pourparler checksum: placeholder */\n:root { --npz-pourparler-checksum: '${placeholder}'; }\n`;
  fs.writeFileSync(outFile, css, 'utf8');
  console.log('wrote placeholder', outFile, placeholder);
  process.exit(0);
}
const data = fs.readFileSync(src, 'utf8');
const hash = crypto.createHash('sha256').update(data).digest('hex');
const css = `/* npz-pourparler checksum: ${hash} */\n:root { --npz-pourparler-checksum: '${hash}'; }\n`;
fs.writeFileSync(outFile, css, 'utf8');
console.log('wrote', outFile, hash);
