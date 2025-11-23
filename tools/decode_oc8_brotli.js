#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PNG } = require('pngjs');

async function decode(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const rs = fs.createReadStream(filePath);
      rs.pipe(new PNG()).on('parsed', function () {
        try {
          const data = this.data; // RGBA
          console.log('[decode] PNG parsed, bytes=', data.length);

          const attempts = [];

          // Candidate buffers: full RGBA buffer, R-only (red curtain)
          const fullBuf = Buffer.from(data);
          attempts.push({ name: 'rgba', buf: fullBuf });

          // R-only
          const bytes = data.length / 4;
          const rOnly = Buffer.alloc(bytes);
          for (let i = 0; i < bytes; i++) rOnly[i] = data[i * 4];
          attempts.push({ name: 'r-only', buf: rOnly });

          // Also try RGB-interleaved (take R,G,B sequentially)
          const rgbBytes = Buffer.alloc(Math.floor((data.length / 4) * 3));
          let j = 0;
          for (let i = 0; i < data.length; i += 4) {
            rgbBytes[j++] = data[i];
            rgbBytes[j++] = data[i + 1];
            rgbBytes[j++] = data[i + 2];
          }
          attempts.push({ name: 'rgb', buf: rgbBytes });

          const maxOffset = Math.min(4096, attempts.reduce((m, a) => Math.max(m, a.buf.length), 0));

          for (const attempt of attempts) {
            const buf = attempt.buf;
            // try full buffer first
            try {
              const dec = zlib.brotliDecompressSync(buf);
              const txt = dec.toString('utf8');
              const j = JSON.parse(txt);
              console.log('[decode] success on attempt', attempt.name, 'offset=0');
              return resolve({ packet: j, method: attempt.name, offset: 0 });
            } catch (e) {
              // continue to sliding window
            }

            // sliding window offsets
            for (let off = 0; off <= Math.min(1024, Math.max(0, buf.length - 16)); off++) {
              try {
                const slice = buf.slice(off);
                const dec = zlib.brotliDecompressSync(slice);
                const txt = dec.toString('utf8');
                const j = JSON.parse(txt);
                console.log('[decode] success on attempt', attempt.name, 'offset=', off);
                return resolve({ packet: j, method: attempt.name, offset: off });
              } catch (e) {
                // ignore
              }
            }
          }

          return reject(new Error('no brotli stream found in PNG (heuristic)'));
        } catch (e) {
          return reject(e);
        }
      }).on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const p = process.argv[2] || path.join('parts', 'ideas_oc8.png');
  if (!fs.existsSync(p)) {
    console.error('file not found', p);
    process.exit(2);
  }
  try {
    const res = await decode(p);
    const outDir = path.join(process.cwd(), '.qflush', 'incoming', 'json');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
    const outPath = path.join(outDir, 'ideas_decoded.json');
    fs.writeFileSync(outPath, JSON.stringify(res.packet, null, 2), 'utf8');
    console.log('\n=== DECODED PACKET (saved to ' + outPath + ') ===');
    console.log(JSON.stringify({ method: res.method, offset: res.offset }, null, 2));
    console.log('\n' + JSON.stringify(res.packet, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Decode failed:', String(e));
    process.exit(1);
  }
}

main();
