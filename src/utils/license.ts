// ROME-TAG: 0x3C04E4

import fs from 'fs';
import path from 'path';
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
  const json = await res.json();
  return json;
}

export async function activateLicense(key: string, productId?: string) {
  const resp = await verifyWithGumroad(key, productId);
  if (resp && resp.success) {
    const lic = { key, product_id: resp.purchase ? resp.purchase.product_id : productId, valid: true, expires_at: resp.purchase ? resp.purchase.license_expires_at : null, verifiedAt: Date.now() } as LicenseRecord;
    saveLicense(lic);
    return { ok: true, license: lic, raw: resp };
  }
  // failure
  const lic = { key, product_id: productId, valid: false, verifiedAt: Date.now() } as LicenseRecord;
  saveLicense(lic);
  return { ok: false, error: resp }; 
}

export default { readLicense, saveLicense, activateLicense };
