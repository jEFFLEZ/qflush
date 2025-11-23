import { cortexSend, cortexWaitFor } from '../../src/cortex/cli';
import fs from 'fs';
import path from 'path';

describe('Cortex bus integration', () => {
  const inbox = path.join('.qflush', 'cortex', 'inbox');
  const outbox = path.join('.qflush', 'cortex', 'outbox');

  beforeAll(() => {
    fs.mkdirSync(inbox, { recursive: true });
    fs.mkdirSync(outbox, { recursive: true });
  });

  it('sends a command and receives a response', async () => {
    const id = cortexSend('npz/sleep', []);
    const res = await cortexWaitFor(id, 10000);
    expect(res).toHaveProperty('id', id);
    expect(res).toHaveProperty('ok');
  }, 15000);
});
