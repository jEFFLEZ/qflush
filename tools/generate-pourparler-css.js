import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
let data = fs.readFileSync(src, 'utf8');
// strip ROME-TAG comment lines to ensure stable checksum despite roman tags
data = data.split(/\r?\n/).filter(l => !/^\s*\/\/\s*ROME-TAG:/i.test(l)).join('\n');
const hash = crypto.createHash('sha256').update(data).digest('hex');
const css = `/* npz-pourparler checksum: ${hash} */\n:root { --npz-pourparler-checksum: '${hash}'; }\n`;
fs.writeFileSync(outFile, css, 'utf8');
console.log('wrote', outFile, hash);
