import type { SpyderPacket } from '../protocol/packet';

export interface ExchangeRecord {
  id: string;
  question: SpyderPacket;
  answer?: SpyderPacket;
  score: number;
  timestamp: number;
  latencyMs?: number;
  classification?: 'short' | 'long' | 'timeout';
  attempts?: number;
}

export class RamMemory {
  records: ExchangeRecord[] = [];

  add(record: ExchangeRecord) {
    this.records.push(record);
  }

  getLast(): ExchangeRecord | undefined {
    return this.records[this.records.length - 1];
  }
}
