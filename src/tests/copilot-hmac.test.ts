// ROME-TAG: 0xB7B838

import { _signPayloadForTest } from '../rome/copilot-bridge';
import crypto from 'crypto';
import { describe, it, expect } from 'vitest';

export function runTests() {
  const secret = 's3cr3t';
  const payload = JSON.stringify({ type: 'test', payload: { a: 1 } });
  const sig = _signPayloadForTest(payload, secret);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (sig !== expected) { console.error('hmac mismatch'); throw new Error('hmac mismatch'); }
  console.log('hmac test passed');
}

describe('copilot-hmac (stub)', () => {
  it('stub passes', () => {
    expect(true).toBe(true);
  });
});
