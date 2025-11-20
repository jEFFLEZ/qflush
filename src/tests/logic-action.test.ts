// ROME-TAG: 0x8F4668

import { loadLogicRules } from '../rome/logic-loader';
import { loadRomeIndexFromDisk } from '../rome/index-loader';
import { evaluateAllRules } from '../rome/logic-loader';

export async function runTests() {
  // ensure rules are loaded
  const rules = loadLogicRules();
  console.log('rules loaded', rules.length);
  const idx = loadRomeIndexFromDisk();
  const actions = evaluateAllRules(idx, Object.keys(idx));
  console.log('evaluateAllRules result', actions);
  if (!Array.isArray(actions)) throw new Error('no actions returned');
}
