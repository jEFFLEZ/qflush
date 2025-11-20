// ROME-TAG: 0xB7B838

import { _signPayloadForTest } from '../rome/copilot-bridge';
import crypto from 'crypto';

export function runTests() {
  const secret = 's3cr3t';
  const payload = JSON.stringify({ type: 'test', payload: { a: 1 } });
  const sig = _signPayloadForTest(payload, secret);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (sig !== expected) { console.error('hmac mismatch'); throw new Error('hmac mismatch'); }
  console.log('hmac test passed');
}
