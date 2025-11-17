"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDetect = runDetect;
const detect_1 = require("../utils/detect");
const logger_1 = require("../utils/logger");
async function runDetect(_opts) {
    logger_1.logger.info("qflash: detecting modules...");
    const detected = await (0, detect_1.detectModules)();
    for (const k of Object.keys(detected)) {
        const v = detected[k];
        logger_1.logger.info(`${k}: ${v.running ? 'running' : 'stopped'}`);
    }
    // return a normalized object
    return { detected, paths: {} };
}
