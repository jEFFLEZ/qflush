#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');

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

function unpackSymbolsToBytes(symbols, bitsPerSymbol) {
  // pack bits MSB-first
  let bitBuffer = 0n;
  let bitCount = 0n;
  const bytes = [];
  for (let s of symbols) {
    bitBuffer = (bitBuffer << BigInt(bitsPerSymbol)) | BigInt(s & ((1<<bitsPerSymbol)-1));
    bitCount += BigInt(bitsPerSymbol);
    while (bitCount >= 8n) {
      const shift = bitCount - 8n;
      const b = Number((bitBuffer >> shift) & 0xFFn);
      bytes.push(b);
      bitBuffer = bitBuffer & ((1n << shift) - 1n);
      bitCount -= 8n;
    }
  }
  return Buffer.from(bytes);
}

function usage(){
  console.error('Usage: node tools/css_decode.js <html_file> <out_path>'); process.exit(2);
}

async function main(){
  const argv = process.argv.slice(2);
  if (argv.length < 2) usage();
  const htmlFile = argv[0];
  const outPath = argv[1];
  const metaFile = htmlFile.replace(/\.html$/,'') + '.meta.json';
  if (!fs.existsSync(metaFile)) { console.error('meta file not found:', metaFile); process.exit(3) }
  const meta = JSON.parse(fs.readFileSync(metaFile,'utf8'));
  const bitsPerSymbol = meta.bitsPerSymbol || 12;

  const html = fs.readFileSync(htmlFile,'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const nodes = doc.querySelectorAll('[data-code]');
  const symbols = [];
  nodes.forEach(n => { symbols.push(parseInt(n.getAttribute('data-code'),10)) });
  const bytes = unpackSymbolsToBytes(symbols, bitsPerSymbol);
  if (bytes.length < 8) { console.error('stream too short'); process.exit(4) }
  const N = Number(bytes.readBigUInt64BE(0));
  const payload = bytes.slice(8, 8+N);
  if (payload.length < 1) { console.error('payload too short'); process.exit(5) }
  const compressed = payload.slice(0, -1);
  const checksum = payload[payload.length-1];
  const expected = crc8_oc8(compressed);
  if (checksum !== expected) { console.error('CRC mismatch', checksum, expected); process.exit(6) }
  let raw;
  if (meta.brotli) raw = zlib.brotliDecompressSync(compressed);
  else raw = compressed;
  fs.writeFileSync(outPath, raw);
  console.log('Wrote', outPath);
}

main().catch(err=>{ console.error(err); process.exit(1); });
