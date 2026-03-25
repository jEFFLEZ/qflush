#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc8_oc8(buf, poly = 0x07, init = 0x00) {
  let crc = init & 0xff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b++) {
      if (crc & 0x80) crc = ((crc << 1) ^ poly) & 0xff;
      else crc = (crc << 1) & 0xff;
    }
  }
  return crc & 0xff;
}

function packToSymbols(fullBuf, bitsPerSymbol) {
  // MSB-first bit packing
  const mask = (1 << bitsPerSymbol) - 1;
  let bitBuffer = 0n;
  let bitCount = 0;
  const symbols = [];
  for (let i = 0; i < fullBuf.length; i++) {
    bitBuffer = (bitBuffer << 8n) | BigInt(fullBuf[i]);
    bitCount += 8;
    while (bitCount >= bitsPerSymbol) {
      const shift = BigInt(bitCount - bitsPerSymbol);
      const sym = Number((bitBuffer >> shift) & BigInt(mask));
      symbols.push(sym);
      bitBuffer = bitBuffer & ((1n << shift) - 1n);
      bitCount -= bitsPerSymbol;
    }
  }
  // remainder pad with zeros to next symbol
  if (bitCount > 0) {
    const sym = Number((bitBuffer << BigInt(bitsPerSymbol - bitCount)) & BigInt(mask));
    symbols.push(sym);
  }
  return symbols;
}

function buildHtml(symbols, opts) {
  const { perRow = 256, bitsPerSymbol } = opts;
  const rows = Math.ceil(symbols.length / perRow);
  const width = perRow;
  // inline minimal CSS and a small JS that does nothing (visual only). data-code used for extraction by decoder script
  const css = `
  <style>
  .grid{display:grid;grid-template-columns:repeat(${width},12px);grid-auto-rows:12px;gap:1px}
  .cell{width:12px;height:12px;background:#ddd;display:block}
  </style>`;
  let body = `<div class="grid">`;
  for (let i = 0; i < symbols.length; i++) {
    body += `<div class="cell" data-code="${symbols[i]}"></div>`;
  }
  body += `</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CSS Dump</title>${css}</head><body>${body}</body></html>`;
  return html;
}

function usage() {
  console.error('Usage: node tools/css_encode.js encode <input> <output_prefix> [--bits 12] [--per-row N] [--no-brotli]');
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) usage();
  const cmd = argv[0];
  if (cmd !== 'encode') usage();
  if (argv.length < 3) usage();
  const input = argv[1];
  const outPrefix = argv[2];

  let bitsPerSymbol = 12;
  let perRow = 256;
  let useBrotli = true;
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-brotli') useBrotli = false;
    else if (a === '--bits' && argv[i+1]) { bitsPerSymbol = parseInt(argv[++i],10) }
    else if (a === '--per-row' && argv[i+1]) { perRow = parseInt(argv[++i],10) }
  }

  const raw = fs.readFileSync(input);
  const compressed = useBrotli ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }) : raw;
  const crc = crc8_oc8(compressed);
  const payload = Buffer.concat([compressed, Buffer.from([crc])]);
  const N = BigInt(payload.length);
  const header = Buffer.alloc(8);
  header.writeBigUInt64BE(N, 0);
  const full = Buffer.concat([header, payload]);

  const symbols = packToSymbols(full, bitsPerSymbol);
  // output HTML
  const html = buildHtml(symbols, { perRow, bitsPerSymbol });
  const outHtml = outPrefix + '.html';
  fs.mkdirSync(path.dirname(outHtml) || '.', { recursive: true });
  fs.writeFileSync(outHtml, html, 'utf8');
  // also write a .meta file describing parameters
  const meta = { bitsPerSymbol, perRow, symbolsCount: symbols.length, brotli: useBrotli };
  fs.writeFileSync(outPrefix + '.meta.json', JSON.stringify(meta, null, 2), 'utf8');
  console.log('Wrote', outHtml);
  console.log('Wrote', outPrefix + '.meta.json');
}

main().catch(err=>{ console.error(err); process.exit(1); });
