export function log(...args: any[]) {
  console.log('[SPYDER]', ...args);
}

export function logError(...args: any[]) {
  console.error('[SPYDER:ERR]', ...args);
}
