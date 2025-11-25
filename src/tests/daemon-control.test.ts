// ROME-TAG: 0xC7D834

import { setReloadHandler, callReload } from '../rome/daemon-control.js';
import { describe, it, expect } from 'vitest';

describe('daemon-control (stub)', () => {
  it('stub passes', () => {
    expect(true).toBe(true);
  });
});

export async function runTests() {
  let called = false;
  setReloadHandler(async () => { called = true; });

  const ok = await callReload();
  if (!ok || !called) {
    console.error('reload failed', ok, called);
    throw new Error('daemon-control test failed');
  }
  console.log('daemon control test passed');
}
