// ROME-TAG: 0x3C04E4

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const STORE = path.join(process.cwd(), '.qflush', 'license.json');

export type LicenseRecord = {
  key: string;
  product_id?: string;
  valid?: boolean;
  expires_at?: string | null;
  verifiedAt?: number;
};

function ensureDir() {
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readLicense(): LicenseRecord | null {
  try {
    if (!fs.existsSync(STORE)) return null;
    const raw = fs.readFileSync(STORE, 'utf8');
    return JSON.parse(raw) as LicenseRecord;
  } catch (e) {
    return null;
  }
}

export function saveLicense(rec: LicenseRecord) {
  try {
    ensureDir();
    fs.writeFileSync(STORE, JSON.stringify(rec, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

async function verifyWithGumroad(key: string, productId?: string) {
  const token = process.env.GUMROAD_TOKEN;
  if (!token) throw new Error('GUMROAD_TOKEN not configured');
  const url = `https://api.gumroad.com/v2/licenses/verify`;
  const body = new URLSearchParams();
  body.append('product_permalink', productId || '');
  body.append('license_key', key);

  const res = await fetch(url, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } });
  const json: any = await res.json();
  return json;
}

export async function activateLicense(key: string, productId?: string) {
  const resp: any = await verifyWithGumroad(key, productId);
  if (resp && (resp as any).success) {
    const purchase = (resp as any).purchase || {};
    const lic = { key, product_id: purchase.product_id || productId, valid: true, expires_at: purchase ? purchase.license_expires_at : null, verifiedAt: Date.now() } as LicenseRecord;
    saveLicense(lic);
    return { ok: true, license: lic, raw: resp };
  }
  // failure
  const lic = { key, product_id: productId, valid: false, verifiedAt: Date.now() } as LicenseRecord;
  saveLicense(lic);
  return { ok: false, error: resp };
}

export default { readLicense, saveLicense, activateLicense };
