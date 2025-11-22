export type ChecksumAlgo = 'xor';

export function xorChecksum(buffer: Uint8Array | Buffer): number {
  let x = 0;
  for (let i = 0; i < buffer.length; i++) x ^= buffer[i];
  return x & 0xff;
}

export function computeChecksum(
  buffer: Uint8Array | Buffer,
  algo: ChecksumAlgo = 'xor'
): number {
  switch (algo) {
    case 'xor':
    default:
      return xorChecksum(buffer);
  }
}
