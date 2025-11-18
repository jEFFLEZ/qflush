import 'dotenv/config';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { listRunning, startProcess, stopProcess, stopAll } from '../supervisor';
import logger from '../utils/logger';
import metricsMiddleware from '../utils/npz-metrics';
import adminRouter from '../utils/npz-admin';
import npzMiddleware from '../utils/npz-middleware';
import gumroad from '../utils/gumroad-license';
import fs from 'fs';
import path from 'path';
import client from 'prom-client';

const PORT = process.env.QFLASHD_PORT ? Number(process.env.QFLASHD_PORT) : 4500;
const AUDIT_LOG = process.env.QFLASHD_AUDIT_LOG || path.join(process.cwd(), '.qflash', 'license-activations.log');
const REVERIFY_INTERVAL_MS = Number(process.env.QFLASHD_REVERIFY_MS || String(24 * 3600 * 1000)); // default 24h

const activationCounter = new client.Counter({ name: 'qflash_license_activation_total', help: 'Total license activation attempts' });
const activationSuccess = new client.Counter({ name: 'qflash_license_activation_success_total', help: 'Successful license activations' });
const activationFailure = new client.Counter({ name: 'qflash_license_activation_failure_total', help: 'Failed license activations' });

const app = express();
app.use(cookieParser());
app.use(express.json());

// Prometheus /metrics
app.use(metricsMiddleware());

// NPZ middleware on /proxy (optional)
app.use('/proxy', npzMiddleware());

// Admin endpoints (npz inspect, lanes, etc.)
app.use('/', adminRouter);

function auditLine(line: string) {
  try {
    const dir = path.dirname(AUDIT_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_LOG, line + '\n', 'utf8');
  } catch (e) {
    logger.warn('Failed to write audit log: ' + String(e));
  }
}

// License activation endpoint
app.post('/license/activate', async (req: Request, res: Response) => {
  activationCounter.inc();
  try {
    const { key, product_id } = req.body || {};
    if (!key) { activationFailure.inc(); return res.status(400).json({ success: false, error: 'license key missing' }); }

    let token = process.env.GUMROAD_TOKEN || gumroad.readTokenFromFile();
    if (!token) { activationFailure.inc(); return res.status(500).json({ success: false, error: 'GUMROAD_TOKEN not configured on daemon' }); }

    const productId = product_id || process.env.GUMROAD_PRODUCT_ID || process.env.GUMROAD_PRODUCT_YEARLY || process.env.GUMROAD_PRODUCT_MONTHLY || '';

    const rec = await gumroad.activateLicense(productId, key, token);
    activationSuccess.inc();
    auditLine(JSON.stringify({ t: Date.now(), key: key.replace(/.(?=.{4})/g, '*'), productId, ok: true }));
    return res.json({ success: true, license: rec });
  } catch (err: any) {
    activationFailure.inc();
    auditLine(JSON.stringify({ t: Date.now(), key: (req.body && req.body.key) ? String(req.body.key).replace(/.(?=.{4})/g, '*') : null, ok: false, err: err && err.message ? err.message : String(err) }));
    logger.warn(`license activation failed: ${err && err.message ? err.message : err}`);
    return res.status(400).json({ success: false, error: err && err.message ? err.message : String(err) });
  }
});

app.get('/license/status', (req: Request, res: Response) => {
  const rec = gumroad.loadLicense();
  if (!rec) return res.json({ success: true, license: null });
  return res.json({ success: true, license: rec, valid: gumroad.isLicenseValid(rec) });
});

// Periodic re-verification of saved license
async function reverifySavedLicense() {
  try {
    const rec = gumroad.loadLicense();
    if (!rec || !rec.key) return;
    const token = process.env.GUMROAD_TOKEN || gumroad.readTokenFromFile();
    if (!token) return;
    const productId = rec.product_id || process.env.GUMROAD_PRODUCT_YEARLY || process.env.GUMROAD_PRODUCT_MONTHLY || '';
    try {
      const data = await gumroad.verifyWithGumroad(productId, rec.key, token);
      const now = Date.now();
      rec.lastVerified = now;
      // update expiresAt if non-recurring and purchase expiry present
      const purchase = (data as any).purchase || {};
      if (!rec.recurring && purchase && purchase.ended_at) {
        rec.expiresAt = new Date(purchase.ended_at).getTime();
      }
      gumroad.saveLicense(rec);
      auditLine(JSON.stringify({ t: now, key: rec.key.replace(/.(?=.{4})/g, '*'), reverify_ok: true }));
    } catch (e: any) {
      auditLine(JSON.stringify({ t: Date.now(), key: rec.key.replace(/.(?=.{4})/g, '*'), reverify_ok: false, err: e && e.message ? e.message : String(e) }));
    }
  } catch (e) {
    logger.warn('Reverify license failed: ' + String(e));
  }
}

setInterval(() => {
  reverifySavedLicense().catch(() => {});
}, REVERIFY_INTERVAL_MS);

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

app.listen(PORT, () => logger.success(`qflash running on http://localhost:${PORT}`));
