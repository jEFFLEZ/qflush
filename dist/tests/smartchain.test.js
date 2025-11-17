"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smartChain_1 = require("../chain/smartChain");
function assertEqual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b))
        throw new Error(msg || `Assertion failed: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}
function runTests() {
    assertEqual((0, smartChain_1.buildPipeline)(["start"]).pipeline, ["detect", "config", "start"]);
    assertEqual((0, smartChain_1.buildPipeline)(["kill", "start"]).pipeline, ["kill", "detect", "config", "start"]);
    assertEqual((0, smartChain_1.buildPipeline)(["purge", "start"]).pipeline, ["detect", "config", "purge", "start"]);
    assertEqual((0, smartChain_1.buildPipeline)(["config", "start", "detect"]).pipeline, ["detect", "config", "start"]);
    assertEqual((0, smartChain_1.buildPipeline)(["exodia", "start"]).pipeline, ["detect", "config", "start", "exodia"]);
    console.log("SmartChain tests passed");
}
runTests();
