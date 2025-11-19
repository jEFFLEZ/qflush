// ROME-TAG: 0xDEC58D

import { parseLogicFile } from '../rome/logic-parser';
import { loadLogicRules } from '../rome/logic-loader';

export async function runTests() {
  const rules = parseLogicFile('src/rome/logic/logic.qfl');
  console.log('parsed rules:', rules.map(r => r.name));
  if (rules.length === 0) throw new Error('no rules parsed');
}
