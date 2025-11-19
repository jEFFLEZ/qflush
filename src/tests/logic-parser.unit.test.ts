import { buildConditionAst, evaluateConditionExprAST } from '../rome/logic-parser';

function testExpr(expr: string, ctx: any, expected: boolean) {
  const ast = buildConditionAst(expr);
  const res = evaluateConditionExprAST(ast, ctx);
  if (res !== expected) {
    console.error('test failed', expr, ctx, res, expected);
    if (!process.env.VITEST_WORKER_ID) setTimeout(() => process.exit(2), 50);
    throw new Error(`logic-parser test failed: ${expr}`);
  }
}

(async ()=>{
  testExpr('file.type == "module" and file.tagChanged', { file: { type: 'module', tagChanged: true } }, true);
  testExpr('file.type == "module" and not file.tagChanged', { file: { type: 'module', tagChanged: false } }, true);
  testExpr('file.type == "asset" or file.type == "module"', { file: { type: 'module' } }, true);
  console.log('logic-parser unit tests passed');
  if (!process.env.VITEST_WORKER_ID) setTimeout(() => process.exit(0), 50);
})();
