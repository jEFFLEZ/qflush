import { computeChecksum } from '../utils/checksum';

export const SPYDER_HEADER = 0x5e; // 0x5P "style" :P

export enum PacketType {
  Question = 1,
  Answer = 2,
  Meta = 3
}

export interface SpyderPacket {
  type: PacketType;
  payload: Uint8Array;
  checksum: number;
}

export function serializePacket(packet: SpyderPacket): Uint8Array {
  const length = packet.payload.length;
  const buffer = new Uint8Array(1 + 1 + 2 + length + 1);
  let offset = 0;

  buffer[offset++] = SPYDER_HEADER;
  buffer[offset++] = packet.type;
  buffer[offset++] = (length >> 8) & 0xff;
  buffer[offset++] = length & 0xff;

  buffer.set(packet.payload, offset);
  offset += length;

  const cs = computeChecksum(buffer.subarray(0, offset));
  buffer[offset] = cs;

  return buffer;
}

export function parsePacket(buffer: Uint8Array): SpyderPacket | null {
  if (buffer.length < 1 + 1 + 2 + 1) return null;
  let offset = 0;
  const header = buffer[offset++];
  if (header !== SPYDER_HEADER) return null;

  const type = buffer[offset++];
  const length = (buffer[offset++] << 8) | buffer[offset++];

  if (buffer.length < 1 + 1 + 2 + length + 1) return null;

  const payload = buffer.subarray(4, 4 + length);
  const checksum = buffer[4 + length];

  const computed = computeChecksum(buffer.subarray(0, 4 + length));
  if (computed !== checksum) {
    return {
      type: type as PacketType,
      payload,
      checksum: -1
    };
  }

  return {
    type: type as PacketType,
    payload,
    checksum
  };
}
