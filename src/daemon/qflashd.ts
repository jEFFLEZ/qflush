import 'dotenv/config';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { listRunning, startProcess, stopProcess, stopAll } from '../supervisor';
import logger from '../utils/logger';
import metricsMiddleware from '../utils/npz-metrics';
import adminRouter from '../utils/npz-admin';
import npzMiddleware from '../utils/npz-middleware';
import gumroad from '../utils/gumroad-license';

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

// License activation endpoint
app.post('/license/activate', async (req: Request, res: Response) => {
  try {
    const { key, product_id } = req.body || {};
    if (!key) return res.status(400).json({ success: false, error: 'license key missing' });

    let token = process.env.GUMROAD_TOKEN || gumroad.readTokenFromFile();
    if (!token) return res.status(500).json({ success: false, error: 'GUMROAD_TOKEN not configured on daemon' });

    const productId = product_id || process.env.GUMROAD_PRODUCT_ID || process.env.GUMROAD_PRODUCT_YEARLY || process.env.GUMROAD_PRODUCT_MONTHLY || '';

    const rec = await gumroad.activateLicense(productId, key, token);
    return res.json({ success: true, license: rec });
  } catch (err: any) {
    logger.warn(`license activation failed: ${err && err.message ? err.message : err}`);
    return res.status(400).json({ success: false, error: err && err.message ? err.message : String(err) });
  }
});

app.get('/license/status', (req: Request, res: Response) => {
  const rec = gumroad.loadLicense();
  if (!rec) return res.json({ success: true, license: null });
  return res.json({ success: true, license: rec, valid: gumroad.isLicenseValid(rec) });
});

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
