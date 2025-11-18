import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// try to import gumroad helper if present
let gumroad: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  gumroad = require('../utils/gumroad-license');
} catch (e) {
  // ignore if not available
}

const PORT = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 4500;
const AUDIT_DIR = path.join(process.cwd(), '.qflush');
const AUDIT_LOG = path.join(AUDIT_DIR, 'license-activations.log');

function ensureAuditDir() {
  try {
    if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function audit(line: any) {
  try {
    ensureAuditDir();
    fs.appendFileSync(AUDIT_LOG, (typeof line === 'string' ? line : JSON.stringify(line)) + '\n', 'utf8');
  } catch (e) {
    // ignore
  }
}

const app = express();
app.use(express.json());

app.post('/license/activate', async (req: Request, res: Response) => {
  const { key, product_id } = req.body || {};
  if (!key) return res.status(400).json({ success: false, error: 'missing key' });
  audit({ t: Date.now(), action: 'activate_attempt', key: key.replace(/.(?=.{4})/g, '*'), product_id });

  if (!gumroad || typeof gumroad.activateLicense !== 'function') {
    return res.status(501).json({ success: false, error: 'gumroad helper not available on daemon' });
  }

  const token = process.env.GUMROAD_TOKEN || '';
  const pid = product_id || process.env.GUMROAD_PRODUCT_ID || process.env.GUMROAD_PRODUCT_YEARLY || process.env.GUMROAD_PRODUCT_MONTHLY || '';

  try {
    const rec = await gumroad.activateLicense(pid, key, token);
    audit({ t: Date.now(), action: 'activate_success', key: key.replace(/.(?=.{4})/g, '*'), product_id: pid });
    return res.json({ success: true, license: rec });
  } catch (err: any) {
    audit({ t: Date.now(), action: 'activate_failed', err: String(err), product_id: pid });
    return res.status(400).json({ success: false, error: err && err.message ? err.message : String(err) });
  }
});

app.get('/license/status', (_req: Request, res: Response) => {
  if (!gumroad || typeof gumroad.loadLicense !== 'function') return res.json({ success: true, license: null });
  const rec = gumroad.loadLicense();
  return res.json({ success: true, license: rec, valid: rec ? gumroad.isLicenseValid(rec) : false });
});

// public webhook endpoint suggested: /qflush/license/webhook
app.post('/qflush/license/webhook', (req: Request, res: Response) => {
  const payload = req.body || {};
  audit({ t: Date.now(), event: 'gumroad_webhook', payload });

  // inspect payload for refund/chargeback/subscription cancel
  const purchase = payload.purchase || payload.data || null;
  let shouldClear = false;

  if (purchase) {
    if (purchase.refunded || purchase.chargebacked) shouldClear = true;
    if (purchase.subscription_cancelled_at || purchase.subscription_ended_at) shouldClear = true;
  }

  const ev = (payload.event || payload.type || '').toString().toLowerCase();
  if (ev.includes('refund') || ev.includes('chargeback') || ev.includes('subscription_cancel')) shouldClear = true;

  if (shouldClear && gumroad && typeof gumroad.clearLicense === 'function') {
    try {
      gumroad.clearLicense();
      audit({ t: Date.now(), event: 'license_cleared_via_webhook' });
    } catch (e) {
      audit({ t: Date.now(), event: 'license_clear_failed', err: String(e) });
    }
  }

  return res.json({ ok: true });
});

// legacy webhook path used earlier
app.post('/webhooks/gumroad', (req: Request, res: Response) => {
  // forward to same handler logic
  return app.handle(req, res);
});

app.get('/status', (_req: Request, res: Response) => {
  res.json({ ok: true, port: PORT });
});

// expose npz pourparler endpoints
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pourparler = require('../utils/npz-pourparler');

  app.post('/npz/pourparler', (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const action = body.action || 'color'; // default action
      const text = String(body.text || '');

      if (action === 'encode') {
        const enc = pourparler.encodeAscii4(text);
        return res.json({ success: true, encoded: enc });
      }

      if (action === 'color') {
        const colored = pourparler.colorizeAscii4(text);
        return res.json({ success: true, colored });
      }

      if (action === 'start') {
        const s = pourparler.startSession(body.systemPrompt || '');
        return res.json({ success: true, session: s });
      }

      if (action === 'send') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const m = pourparler.sendMessage(body.sessionId, body.role || 'user', String(body.text || ''));
        return res.json({ success: true, message: m });
      }

      if (action === 'history') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const h = pourparler.getHistory(body.sessionId);
        return res.json({ success: true, history: h });
      }

      if (action === 'end') {
        if (!body.sessionId) return res.status(400).json({ success: false, error: 'sessionId missing' });
        const ok = pourparler.endSession(body.sessionId);
        return res.json({ success: true, ended: ok });
      }

      if (action === 'checksum') {
        try {
          const cssPath = path.join(process.cwd(), 'extensions', 'vscode-npz', 'pourparler-checksum.css');
          if (fs.existsSync(cssPath)) {
            const content = fs.readFileSync(cssPath, 'utf8');
            // extract the checksum value
            const m = content.match(/--npz-pourparler-checksum:\s*'([a-f0-9]+)'/i);
            const checksum = m ? m[1] : null;
            return res.json({ success: true, checksum, path: cssPath });
          }
          return res.status(404).json({ success: false, error: 'css not found' });
        } catch (err) {
          return res.status(500).json({ success: false, error: String(err) });
        }
      }

      return res.status(400).json({ success: false, error: 'unknown action' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: String(e) });
    }
  });
} catch (e) {
  // ignore if module not present
}

app.listen(PORT, () => {
  console.log(`qflush running on http://localhost:${PORT}`);
});
