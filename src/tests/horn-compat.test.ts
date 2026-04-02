import { describe, expect, it } from 'vitest';

import { registerHorn, scream, useHorn } from '../core/horn.js';
import { run } from '../index.js';

describe('horn compatibility', () => {
  it('supports registerHorn and scoped useHorn', async () => {
    let directPayload: any = null;
    let scopedPayload: any = null;

    const unregisterDirect = registerHorn('test.event', async (payload) => {
      directPayload = payload;
      return { ok: true, mode: 'direct' };
    });
    const unregisterScoped = registerHorn('scope.hello', async (payload) => {
      scopedPayload = payload;
      return { ok: true, mode: 'scoped' };
    });

    try {
      const direct = await scream('test.event', { foo: 42 });
      expect(direct).toEqual({ ok: true, mode: 'direct' });
      expect(directPayload).toEqual({ foo: 42 });

      const horn = useHorn('scope');
      const scoped = await horn.scream('hello', { bar: 99 });
      expect(scoped).toEqual({ ok: true, mode: 'scoped' });
      expect(scopedPayload).toEqual({ bar: 99 });
    } finally {
      unregisterDirect();
      unregisterScoped();
    }
  });

  it('falls back to an explicit binary when no horn is registered', async () => {
    const result = await scream('missing.event', { noop: true }, {
      bin: process.execPath,
      args: ['-v'],
    }) as any;

    expect(result.code).toBe(0);
    expect(String(result.out || '').trim()).toMatch(/^v\d+/);
  });
});

describe('programmatic qflush API', () => {
  it('exports run() for local package execution', async () => {
    const result = await run({
      flow: 'a11.memory.summary.v1',
      payload: {
        previousSummary: 'Utilisateur: Jeff',
        latestUserMessage: 'Je veux un resume propre',
      },
    }) as any;

    expect(result.ok).toBe(true);
    expect(String(result.output || '')).toContain('Je veux un resume propre');
  });
});
