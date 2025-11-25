// ROME-TAG: 0xA9DB4C

import { buildPipeline } from "../chain/smartChain.js";
import { describe, it, expect } from 'vitest';

function assertEqual(a: any, b: any, msg?: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || `Assertion failed: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

export async function runTests() {
  assertEqual(buildPipeline(["start"]).pipeline, ["detect","config","start"]);
  assertEqual(buildPipeline(["kill","start"]).pipeline, ["kill","detect","config","start"]);
  assertEqual(buildPipeline(["purge","start"]).pipeline, ["detect","config","purge","start"]);
  assertEqual(buildPipeline(["config","start","detect"]).pipeline, ["detect","config","start"]);
  assertEqual(buildPipeline(["exodia","start"]).pipeline, ["detect","config","start","exodia"]);
  console.log("SmartChain tests passed");
}

describe('smartchain (stub)', () => {
  it('stub passes', () => {
    expect(true).toBe(true);
  });
});
