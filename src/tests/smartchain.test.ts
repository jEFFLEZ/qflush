<<<<<<< HEAD
// ROME-TAG: 0xA9DB4C

=======
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
import { buildPipeline } from "../chain/smartChain";

function assertEqual(a: any, b: any, msg?: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || `Assertion failed: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

<<<<<<< HEAD
export async function runTests() {
=======
function runTests() {
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
  assertEqual(buildPipeline(["start"]).pipeline, ["detect","config","start"]);
  assertEqual(buildPipeline(["kill","start"]).pipeline, ["kill","detect","config","start"]);
  assertEqual(buildPipeline(["purge","start"]).pipeline, ["detect","config","purge","start"]);
  assertEqual(buildPipeline(["config","start","detect"]).pipeline, ["detect","config","start"]);
  assertEqual(buildPipeline(["exodia","start"]).pipeline, ["detect","config","start","exodia"]);
  console.log("SmartChain tests passed");
}
<<<<<<< HEAD
=======

runTests();
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
