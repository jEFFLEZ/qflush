import * as path from 'path';
import * as fs from 'fs';
import { parseLogicFile, LogicRule, evaluateConditionExpr, buildConditionAst, evaluateConditionExprAST } from './logic-parser';
import { RomeIndex, RomeTagRecord } from './rome-tag';

const LOGIC_PATH = path.join(process.cwd(), '.qflush', 'logic.qfl');

let rules: LogicRule[] = [];

export function loadLogicRules(): LogicRule[] {
  // prefer .qflush/logic.qfl then src/rome/logic/logic.qfl
  const alt = path.join(process.cwd(), 'src', 'rome', 'logic', 'logic.qfl');
  const p = fs.existsSync(LOGIC_PATH) ? LOGIC_PATH : alt;
  if (!fs.existsSync(p)) { rules = []; return rules; }
  try {
    rules = parseLogicFile(p);
  } catch (e) { rules = []; }
  return rules;
}

export function evaluateRulesForRecord(index: RomeIndex, rec: RomeTagRecord, changedPaths: string[] = []) {
  const matched: { rule: string; actions: string[] }[] = [];
  for (const r of rules) {
    const cond = r.when || '';
    // build AST and evaluate with context
    try {
      const ast = buildConditionAst(cond);
      const ctx = { file: rec, romeIndexUpdated: (changedPaths && changedPaths.length>0) };
      const ok = evaluateConditionExprAST(ast, ctx);
      if (ok) matched.push({ rule: r.name, actions: [r.do] });
    } catch (e) {
      // ignore
    }
  }
  return matched;
}

export function evaluateAllRules(index: RomeIndex, changedPaths: string[] = []) {
  const actions: { path: string; actions: string[]; rule: string }[] = [];
  for (const rec of Object.values(index)) {
    const a = evaluateRulesForRecord(index, rec as any, changedPaths);
    for (const m of a) actions.push({ path: (rec as any).path, actions: m.actions, rule: m.rule });
  }
  // sort by rule priority if available
  return actions;
}

export function getRules() { return rules; }
