#!/usr/bin/env node
import fetch from 'node-fetch';
import * as readline from 'readline';

async function postMessage(msg: string) {
  try {
    const res = await fetch('http://localhost:4500/copilot/message', { method: 'POST', body: JSON.stringify({ message: msg }), headers: { 'Content-Type': 'application/json' } });
    const j = await res.json();
    console.log('sent', j);
  } catch (e) { console.error('send failed', e); }
}

export default async function runCopilot(args: string[]) {
  if (args.includes('--stream')) {
    // open SSE stream
    const EventSource = require('eventsource');
    const es = new EventSource('http://localhost:4500/copilot/stream');
    es.onmessage = (ev: any) => { console.log('copilot event', ev.data); };
    es.onerror = (e: any) => { console.error('SSE error', e); es.close(); };
    return 0;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('message> ', async (answer) => { await postMessage(answer); rl.close(); process.exit(0); });
  return 0;
}
