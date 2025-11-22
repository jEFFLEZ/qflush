export type PacketType = 1 | 2 | 3;

export interface Packet {
  header: number; // 1 byte
  type: PacketType; // 1 byte
  length: number; // 2 bytes
  payload: Uint8Array;
  checksum: number; // 1 byte
}

const HEADER = 0x5A;

export function encodePacket(type: PacketType, payload: Uint8Array): Uint8Array {
  const length = payload.length;
  const buffer = new Uint8Array(1 + 1 + 2 + length + 1);
  buffer[0] = HEADER;
  buffer[1] = type;
  buffer[2] = (length >> 8) & 0xff;
  buffer[3] = length & 0xff;
  buffer.set(payload, 4);
  let checksum = 0;
  for (let i = 0; i < 4 + length; i++) checksum ^= buffer[i];
  buffer[4 + length] = checksum;
  return buffer;
}

export function decodePacket(buf: Uint8Array): Packet | null {
  if (buf.length < 5) return null;
  if (buf[0] !== HEADER) return null;
  const type = buf[1] as PacketType;
  const length = (buf[2] << 8) | buf[3];
  if (buf.length < 4 + length + 1) return null;
  const payload = buf.slice(4, 4 + length);
  const checksum = buf[4 + length];
  let cs = 0;
  for (let i = 0; i < 4 + length; i++) cs ^= buf[i];
  const valid = cs === checksum;
  return { header: buf[0], type, length, payload, checksum: valid ? checksum : 0 };
}
