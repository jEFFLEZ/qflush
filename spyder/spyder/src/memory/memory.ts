function simpleId() {
  const n = Math.floor(Math.random() * 0xffffffff);
  const s = n.toString(16);
  return 'i' + ('00000000' + s).slice(-8);
}

export type SpyderMessage = {
  id: string;
  bits: Uint8Array;
  type: number;
  valid: boolean;
  score: number;
  timestamp: number;
};

export class SpyderMemory {
  ram: SpyderMessage[] = [];
  cache: SpyderMessage[] = [];
  dead: SpyderMessage[][] = [];

  add(msg: Omit<SpyderMessage, 'id' | 'timestamp'>) {
    const m: SpyderMessage = { ...msg, id: simpleId(), timestamp: Date.now() } as SpyderMessage;
    this.ram.push(m);
    if (m.valid && m.score >= 2) this.cache.push(m);
  }

  snapshot() {
    this.dead.push([...this.cache]);
    this.cache = [];
  }
}
