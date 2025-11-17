"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInspect = runInspect;
const logger_1 = require("../utils/logger");
const detect_1 = require("../utils/detect");
async function runInspect(opts) {
    logger_1.logger.info("qflash: inspecting ecosystem...");
    const detected = opts?.detected || (await (0, detect_1.detectModules)());
    for (const key of Object.keys(detected)) {
        const v = detected[key];
        logger_1.logger.info(`${key}: ${v.running ? `running (pid=${v.pid || 'unknown'})` : 'stopped'}`);
        if (v.port)
            logger_1.logger.info(`  port: ${v.port}`);
    }
}
