import * as net from 'net';
import { serializePacket, PacketType } from '../src/protocol/packet';

function makeQuestion(text: string) {
  const payload = new TextEncoder().encode(text);
  return serializePacket({ type: PacketType.Question, payload, checksum: 0 });
}

const client = new net.Socket();
client.connect(4000, '127.0.0.1', () => {
  console.log('Connected to SPYDER');
  const pkt = makeQuestion('hello world');
  client.write(Buffer.from(pkt));
});

client.on('data', (data) => {
  console.log('Received', data);
  client.destroy();
});

client.on('close', () => console.log('Connection closed'));
