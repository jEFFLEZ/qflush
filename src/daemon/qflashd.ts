import http from 'http';
import { listRunning, startProcess, stopProcess, stopAll } from '../supervisor';
import { logger } from '../utils/logger';

const PORT = process.env.QFLASHD_PORT ? Number(process.env.QFLASHD_PORT) : 4500;

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/status') {
    const running = listRunning();
    res.end(JSON.stringify({ running }));
    return;
  }
  if (req.url && req.url.startsWith('/stop')) {
    const name = req.url.split('/')[2];
    if (name) {
      const ok = stopProcess(name);
      res.end(JSON.stringify({ ok }));
      return;
    }
    stopAll();
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => logger.success(`qflashd running on http://localhost:${PORT}`));
