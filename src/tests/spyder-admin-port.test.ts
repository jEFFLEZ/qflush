import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'path';
import os from 'node:os';

describe('spyder admin port persistence', () => {
  let tmpDir: string;
  let origCwd: string;
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    origCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qflush-test-'));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    try {
      process.chdir(origCwd);
    } catch {};
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {};
    process.env = { ...OLD_ENV };
    vi.restoreAllMocks();
  });

  it('writes .qflush/spyder.config.json with adminPort when QFLUSH_SPYDER_ADMIN_PORT is set', async () => {
    // Ensure services.startService is mocked so runStart does not try to actually start processes
    vi.mock('../../src/services', () => ({ startService: async () => { return; } }));

    process.env.QFLUSH_SPYDER_ADMIN_PORT = '51234';

    const { runStart } = await import('../../src/commands/start.js');

    // Call runStart asking only for spyder to avoid other modules
    await runStart({ services: ['spyder'] as any, flags: {} as any } as any);

    const cfgPath = path.join(process.cwd(), '.qflush', 'spyder.config.json');
    expect(fs.existsSync(cfgPath)).toBe(true);
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const cfg = JSON.parse(raw || '{}');
    expect(cfg.adminPort).toBe(51234);
  });
});
