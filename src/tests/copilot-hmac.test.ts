import { _signPayloadForTest } from '../rome/copilot-bridge';
import crypto from 'crypto';

const secret = 's3cr3t';
const payload = JSON.stringify({ type: 'test', payload: { a: 1 } });
const sig = _signPayloadForTest(payload, secret);
const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
if (sig !== expected) { console.error('hmac mismatch'); process.exit(2); }
console.log('hmac test passed');
process.exit(0);
