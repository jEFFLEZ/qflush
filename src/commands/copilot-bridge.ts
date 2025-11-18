#!/usr/bin/env node
import fetch from 'node-fetch';
import * as fs from 'fs';

export default async function runCopilotBridge(args: string[]) {
  const cfgPath = '.qflush/copilot.json';
  if (!fs.existsSync(cfgPath)) { console.error('copilot not configured'); return 1; }
  const cfg = JSON.parse(fs.readFileSync(cfgPath,'utf8'));
  if (args[0] === 'send-snapshot') {
    const state = { /* minimal snapshot */ };
    try { await fetch(cfg.webhookUrl, { method: 'POST', body: JSON.stringify({ type: 'engine_snapshot', snapshot: state }), headers: { 'Content-Type': 'application/json' } }); console.log('sent'); } catch (e) { console.error('failed', e); return 2; }
    return 0;
  }
  console.log('copilot-bridge: noop');
  return 0;
}
