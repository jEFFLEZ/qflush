import * as net from 'net';
import config from './config/default.json';
import { log, logError } from './utils/logger';
import {
  PacketType,
  parsePacket,
  serializePacket
} from './protocol/packet';
import { decodePayload, registerDecoder } from './protocol/decoder';
import { RamMemory } from './memory/ram';
import { CacheMemory } from './memory/cache';
import { DeadMemory } from './memory/dead';
import { SpiderWeb } from './graph/web';
import { computeScore } from './analyze/score';
import { askA11 } from './teacher/bridge';
import { elapsedMs, classifyLatency } from './utils/metrics';
import { loadPlugins } from './plugins/loader';
import { Collector } from './utils/collector';
import { createAdminServer } from './admin/server';
import { loadLanguageDecoders } from './lang/loader';

const ram = new RamMemory();
const cache = new CacheMemory();
const dead = new DeadMemory();
const web = new SpiderWeb();
const collector = new Collector();

let exchangeCounter = 0;

const spyderCtx = {
  web,
  ram,
  cache,
  dead,
  config,
  registerDecoder,
  askA11,
  log,
  logError
};

// load plugins (non-blocking)
loadPlugins(spyderCtx as any).catch(e => logError('plugin loader failed', e));

// load language decoders
loadLanguageDecoders().catch(e => logError('language loader failed', e));

// start admin server
const admin = createAdminServer((config as any).adminPort || 4001, collector, () => ({ web, ram, cache, dead }));
log('Admin server listening on', (config as any).adminPort || 4001);

async function callA11WithRetry(text: string, maxRetries: number, timeoutMs: number) {
  let attempts = 0;
  const start = Date.now();
  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      const before = Date.now();
      const resp = await askA11((config as any).a11Endpoint, text);
      const latency = Date.now() - before;
      collector.inc('requests_total');
      collector.observe('latency_ms', latency);
      return { resp: resp.text, attempts, latency, timedOut: false };
    } catch (e) {
      collector.inc('requests_error');
      if (attempts > maxRetries) {
        return { resp: 'ERROR_A11', attempts, latency: Date.now() - start, timedOut: true };
      }
      // else retry
    }
  }
  return { resp: 'ERROR_A11', attempts: 0, latency: 0, timedOut: true };
}

const server = net.createServer((socket: any) => {
  log('Client connected');

  socket.on('data', async (data: any) => {
    try {
      const packet = parsePacket(new Uint8Array(data));
      if (!packet) {
        logError('Invalid packet structure');
        collector.inc('invalid_packet');
        return;
      }

      const checksumOk = packet.checksum >= 0;

      if (packet.type === PacketType.Question) {
        const decoded = await decodePayload(packet.payload).catch(() => null);
        const decodeOk = decoded !== null;

        const text =
          typeof decoded === 'string'
            ? decoded
            : JSON.stringify(decoded);

        log('Q:', text);

        // call A-11 with retries and measure latency
        const start = Date.now();
        const call = await callA11WithRetry(text, (config as any).maxRetries, (config as any).echoTimeoutMs);
        const latency = call.latency;
        const classification = call.timedOut
          ? 'timeout'
          : classifyLatency(latency, (config as any).longRequestThresholdMs);

        const responseText = call.resp;
        const payloadBytes = new TextEncoder().encode(responseText);
        const answerPacket = serializePacket({
          type: PacketType.Answer,
          payload: payloadBytes,
          checksum: 0
        });

        socket.write(Buffer.from(answerPacket));

        const score = computeScore({ checksumOk, decodeOk, responseOk: !call.timedOut });

        const id = `ex-${++exchangeCounter}`;
        ram.add({
          id,
          question: packet,
          answer: parsePacket(answerPacket)!,
          score,
          timestamp: Date.now(),
          latencyMs: latency,
          classification: classification as any,
          attempts: call.attempts
        });

        if ((config as any).scoreThreshold && score >= (config as any).scoreThreshold) {
          const last = ram.getLast();
          if (last) cache.promote(last);
        }

        // graphe simple : question -> réponse
        web.addNode({ id: `${id}-q`, type: 'message' });
        web.addNode({ id: `${id}-a`, type: 'message' });
        web.addEdge(`${id}-q`, `${id}-a`, 'sequence');
      }
    } catch (e) {
      logError('Error handling data', e);
    }
  });

  socket.on('close', () => {
    log('Client disconnected');
  });
});

server.listen((config as any).tcpPort, (config as any).host, () => {
  log(`SPYDER TCP listening on ${(config as any).host}:${(config as any).tcpPort}`);
});

// snapshot périodique
setInterval(() => {
  if (cache.records.length > 0) {
    dead.snapshot(cache.records);
    cache.clear();
    log('Snapshot saved to dead memory');
  }
}, (config as any).snapshotIntervalMs);
