"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPurge = runPurge;
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
const exec_1 = require("../utils/exec");
async function runPurge(opts) {
    logger_1.logger.info("qflash: purging caches, logs, sessions...");
    const paths = (0, paths_1.resolvePaths)(opts?.detected || {});
    const targets = [];
    for (const key of Object.keys(paths)) {
        const p = paths[key];
        if (!p)
            continue;
        targets.push(`${p}/.cache`);
        targets.push(`${p}/logs`);
        targets.push(`${p}/tmp`);
        targets.push(`${p}/sessions`);
    }
    for (const t of targets) {
        try {
            (0, exec_1.rimrafSync)(t);
            logger_1.logger.success(`Removed ${t}`);
        }
        catch (err) {
            logger_1.logger.warn(`Failed to remove ${t}: ${err}`);
        }
    }
    logger_1.logger.info("Purge complete.");
}
