import * as fs from 'fs';
import normalize from './normalize';

export function xorChecksum(buffer: Uint8Array | Buffer): number {
  let x = 0;
  for (let i = 0; i < buffer.length; i++) x ^= buffer[i];
  return x & 0xff;
}

export function checksumBufferIgnoringRomeTag(buf: Buffer | Uint8Array): number {
  // normalize by removing ROME-TAG lines from UTF-8 interpretation
  const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : Buffer.from(buf).toString('utf8');
  const cleaned = normalize.stripRomeTagLines(text);
  const b = Buffer.from(cleaned, 'utf8');
  return xorChecksum(b);
}

export function checksumFileIgnoringRomeTag(filePath: string): number {
  const raw = fs.readFileSync(filePath);
  return checksumBufferIgnoringRomeTag(raw);
}

export default { xorChecksum, checksumBufferIgnoringRomeTag, checksumFileIgnoringRomeTag };
