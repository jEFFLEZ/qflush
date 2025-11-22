export interface ScoreContext {
  checksumOk: boolean;
  decodeOk: boolean;
  responseOk: boolean;
}

export function computeScore(ctx: ScoreContext): number {
  let s = 0;
  if (ctx.checksumOk) s += 1;
  if (ctx.decodeOk) s += 1;
  if (ctx.responseOk) s += 1;
  return s;
}
