import http from 'http';
import { Collector } from '../utils/collector';
import { listDecoders } from '../protocol/decoder';

export function createAdminServer(port: number, collector: Collector, getState: () => any) {
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    if (!req.url) {
      res.writeHead(400);
      res.end('bad request');
      return;
    }

    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(collector.snapshot()));
      return;
    }

    if (req.url === '/memory') {
      const state = getState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ram: state.ram.records, cache: state.cache.records, dead: state.dead.snapshots }));
      return;
    }

    if (req.url === '/graph') {
      const state = getState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ nodes: Array.from(state.web.nodes.entries()), edges: state.web.edges }));
      return;
    }

    if (req.url === '/decoders') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ decoders: listDecoders() }));
      return;
    }

    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  server.listen(port, '127.0.0.1');
  return server;
}
