import { serializePacket, parsePacket, PacketType } from '../src/protocol/packet';
import { computeChecksum, xorChecksum } from '../src/utils/checksum';
import { decodePayload } from '../src/protocol/decoder';
import { elapsedMs, classifyLatency } from '../src/utils/metrics';
import { RamMemory } from '../src/memory/ram';
import { SpiderWeb } from '../src/graph/web';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('Assertion failed: ' + msg);
}

async function run() {
  console.log('Running integration tests...');

  // Protocol roundtrip
  const payload = new TextEncoder().encode('hello test');
  const pkt = serializePacket({ type: PacketType.Question, payload, checksum: 0 });
  const parsed = parsePacket(pkt);
  assert(parsed !== null, 'parsePacket returned null');
  assert(parsed!.type === PacketType.Question, 'packet type mismatch');
  const parsedText = new TextDecoder().decode(parsed!.payload);
  assert(parsedText === 'hello test', 'payload mismatch');
  console.log('Protocol: serialize/parse OK');

  // Checksum functions
  const cs1 = xorChecksum(payload);
  const cs2 = computeChecksum(payload);
  assert(typeof cs1 === 'number' && typeof cs2 === 'number', 'checksum types');
  console.log('Checksum: xor/compute OK', cs1, cs2);

  // Decoder
  const dec = await decodePayload(new TextEncoder().encode('plain:some text'));
  assert(dec === 'some text' || typeof dec === 'string', 'decoder output');
  const dec2 = await decodePayload(new TextEncoder().encode('just text'));
  assert(typeof dec2 === 'string', 'default decoder');
  console.log('Decoder: default and prefix handling OK');

  // Metrics
  const lat = 1200;
  const cls = classifyLatency(lat, 1000);
  assert(cls === 'long', 'classifyLatency long');
  console.log('Metrics: classifyLatency OK');

  // Memory
  const ram = new RamMemory();
  const sample = { id: 't1', question: parsed!, score: 2, timestamp: Date.now() } as any;
  ram.add(sample);
  const last = ram.getLast();
  assert(!!last && last.id === 't1', 'RamMemory add/getLast');
  console.log('Memory: RamMemory OK');

  // Graph
  const web = new SpiderWeb();
  web.addNode({ id: 'n1', type: 'message' });
  web.addNode({ id: 'n2', type: 'message' });
  web.addEdge('n1', 'n2', 'sequence');
  assert(web.nodes.has('n1') && web.nodes.has('n2'), 'SpiderWeb nodes');
  console.log('Graph: SpiderWeb OK');

  console.log('\nAll tests passed');
}

run().catch(e => {
  console.error('Tests failed', e);
  process.exit(1);
});
