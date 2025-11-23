import fs from 'fs';
import zlib from 'zlib';
import { PNG } from 'pngjs';
import crypto from 'crypto';

const seenIds = new Set<string>();

export function decodeCortexPNG(file: string) {
  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);
  const bytes: number[] = [];
  for (let i = 0; i < png.data.length; i += 4) {
    bytes.push(png.data[i], png.data[i + 1], png.data[i + 2]);
  }
  // trim trailing zeros that were padding
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  const compressed = Buffer.from(bytes.slice(0, end));
  const oc8 = png.text && png.text.oc8 ? Number(png.text.oc8) : null;
  const calc = crypto.createHash('sha256').update(compressed).digest().subarray(0, 1)[0];
  if (oc8 !== null && oc8 !== calc) throw new Error('OC8 checksum mismatch');

  const json = zlib.brotliDecompressSync(compressed);
  const payload = JSON.parse(json.toString('utf8'));

  // simple replay protection: ensure id not seen
  if (payload && payload.id) {
    if (seenIds.has(payload.id)) throw new Error('replay detected');
    seenIds.add(payload.id);
    // keep seenIds size bounded
    if (seenIds.size > 10000) {
      // drop oldest: convert to array (simple)
      const it = seenIds.values();
      const remove = it.next().value;
      if (remove) seenIds.delete(remove);
    }
  }

  return payload;
}
