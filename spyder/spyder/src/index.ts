import * as net from 'net';
import { encodePacket, decodePacket } from './protocol/packet';
import { SpyderMemory } from './memory/memory';
import { sendToA11 } from './teacher/bridge';

const PORT = 4000;
const memory = new SpyderMemory();

const server = net.createServer((socket: any) => {
  console.log('Client connected');
  socket.on('data', async (data: any) => {
    try {
      const buf = Uint8Array.from(data);
      const pkt = decodePacket(buf);
      if (!pkt) return;
      const valid = pkt.checksum !== 0;
      const score = valid ? 2 : 0;
      memory.add({ bits: pkt.payload, type: pkt.type, valid, score });
      if (pkt.type === 1) {
        const resp = await sendToA11(pkt.payload);
        const out = encodePacket(2 as any, resp);
        const sendBuf = Buffer.from(out);
        socket.write(sendBuf);
        memory.add({ bits: resp, type: 2, valid: resp.length > 0, score: resp.length > 0 ? 2 : 0 });
      }
    } catch (e) {
      // ignore errors in MVP
    }
  });
  socket.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, '127.0.0.1', () => console.log(`SPYDER listening on ${PORT}`));
