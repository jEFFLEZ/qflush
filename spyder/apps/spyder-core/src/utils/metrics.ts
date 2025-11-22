export function elapsedMs(start: number): number {
  return Date.now() - start;
}

export function isLongRequest(ms: number, threshold: number): boolean {
  return ms >= threshold;
}

export function classifyLatency(ms: number, threshold: number) {
  return isLongRequest(ms, threshold) ? 'long' : 'short';
}
