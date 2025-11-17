"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKill = runKill;
const logger_1 = require("../utils/logger");
const detect_1 = require("../utils/detect");
async function runKill(_opts) {
    logger_1.logger.info("qflash: killing modules...");
    const killed = await (0, detect_1.findAndKill)();
    logger_1.logger.info(`Killed ${killed.length} processes`);
}
