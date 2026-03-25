#!/usr/bin/env node
// Simple helper to create a sample CORTEX PNG command into .qflush/cortex/inbox
// Usage: node tools/create_cortex_png.js <cmd> [arg1 arg2 ...]

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PNG } = require('pngjs');

function encodeCortex(ner, outFile) {
  const json = Buffer.from(JSON.stringify(ner), 'utf8');
  const compressed = zlib.brotliCompressSync(json, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });

  const pixelsCount = Math.ceil(compressed.length / 3);
  const size = Math.ceil(Math.sqrt(pixelsCount));
  const png = new PNG({ width: size, height: size });

  let byteIndex = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = (size * y + x) << 2;
      png.data[k] = compressed[byteIndex++] || 0;
      png.data[k + 1] = compressed[byteIndex++] || 0;
      png.data[k + 2] = compressed[byteIndex++] || 0;
      png.data[k + 3] = 255;
    }
  }

  const crypto = require('crypto');
  const oc8 = crypto.createHash('sha256').update(compressed).digest().subarray(0,1)[0];
  png.text = png.text || {};
  png.text.oc8 = String(oc8);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const ws = fs.createWriteStream(outFile + '.tmp');
  png.pack().pipe(ws);
  ws.on('finish', () => {
    try {
      fs.renameSync(outFile + '.tmp', outFile);
      console.log('Wrote', outFile);
    } catch (e) {
      console.error('Failed to finalize file', e);
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node tools/create_cortex_png.js <cmd> [arg1 arg2 ...]');
    process.exit(2);
  }
  const cmd = args[0];
  const cmdArgs = args.slice(1);

  const id = 'cortex-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const ner = { id, cmd, args: cmdArgs, timestamp: Date.now() };

  const out = path.join('.qflush', 'cortex', 'inbox', id + '.png');
  encodeCortex(ner, out);
}

if (require.main === module) main();
