import type { ExchangeRecord } from './ram';

export class DeadMemory {
  snapshots: ExchangeRecord[][] = [];

  snapshot(cache: ExchangeRecord[]) {
    this.snapshots.push([...cache]);
  }
}
