#!/usr/bin/env node
// ROME-TAG: 0x66F831

import { loadLogicRules } from '../rome/logic-loader';
import { loadRomeIndexFromDisk } from '../rome/index-loader';
import { evaluateRulesForRecord } from '../rome/logic-loader';

export default async function runLogic(args: string[]) {
  const rules = loadLogicRules();
  console.log('Loaded rules:', rules.map(r=>r.name));
  const idx = loadRomeIndexFromDisk();
  for (const p of Object.values(idx)) {
    const matches = evaluateRulesForRecord(idx, p as any);
    if (matches.length) console.log('Match for', (p as any).path, matches);
  }
  return 0;
}
