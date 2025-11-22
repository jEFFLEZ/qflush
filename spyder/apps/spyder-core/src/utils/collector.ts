type Counters = { [k: string]: number };

export class Collector {
  counters: Counters = {};
  histograms: { [k: string]: number[] } = {};

  inc(name: string, value = 1) {
    this.counters[name] = (this.counters[name] || 0) + value;
  }

  observe(name: string, v: number) {
    this.histograms[name] = this.histograms[name] || [];
    this.histograms[name].push(v);
  }

  snapshot() {
    return {
      counters: { ...this.counters },
      histograms: { ...this.histograms }
    };
  }
}
