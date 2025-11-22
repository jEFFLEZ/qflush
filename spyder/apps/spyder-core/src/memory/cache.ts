import type { ExchangeRecord } from './ram';

export class CacheMemory {
  records: ExchangeRecord[] = [];

  promote(record: ExchangeRecord) {
    this.records.push(record);
  }

  clear() {
    this.records = [];
  }
}
