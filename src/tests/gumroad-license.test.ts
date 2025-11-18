// ROME-TAG: 0x70150D

import { saveLicense, loadLicense, clearLicense } from '../utils/gumroad-license';
import fs from 'fs';
import path from 'path';

const TMP = path.join(process.cwd(), '.qflash-test', 'license.json');

describe('gumroad-license save/load/clear', () => {
  beforeAll(() => {
    process.env.GUMROAD_LICENSE_PATH = TMP;
    try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch {}
  });

  afterAll(() => {
    try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch {}
  });

  test('save and load', () => {
    const rec = { key: 'ABC', product_id: 'P1', createdAt: Date.now() } as any;
    saveLicense(rec);
    const loaded = loadLicense();
    expect(loaded).not.toBeNull();
    expect(loaded!.key).toBe('ABC');
  });

  test('clear', () => {
    clearLicense();
    const loaded = loadLicense();
    expect(loaded).toBeNull();
  });
});
