import 'dotenv/config';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { listRunning, startProcess, stopProcess, stopAll } from '../supervisor';
import logger from '../utils/logger';
import metricsMiddleware from '../utils/npz-metrics';
import adminRouter from '../utils/npz-admin';
import npzMiddleware from '../utils/npz-middleware';

const PORT = process.env.QFLASHD_PORT ? Number(process.env.QFLASHD_PORT) : 4500;

const app = express();
app.use(cookieParser());
app.use(express.json());

// Prometheus /metrics
app.use(metricsMiddleware());

// NPZ middleware on /proxy (optional)
app.use('/proxy', npzMiddleware());

// Admin endpoints (npz inspect, lanes, etc.)
app.use('/', adminRouter);

app.get('/status', (req: Request, res: Response) => {
  const running = listRunning();
  res.json({ running });
});

app.get('/stop/:name?', (req: Request, res: Response) => {
  const name = req.params.name as string | undefined;
  if (name) {
    const ok = stopProcess(name);
    res.json({ ok });
    return;
  }
  stopAll();
  res.json({ ok: true });
});

app.listen(PORT, () => logger.success(`qflashd running on http://localhost:${PORT}`));
