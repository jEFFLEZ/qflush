"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStart = runStart;
const detect_1 = require("../utils/detect");
const logger_1 = require("../utils/logger");
const exec_1 = require("../utils/exec");
const paths_1 = require("../utils/paths");
async function runStart(opts) {
    logger_1.logger.info("qflash: starting modules...");
    const detected = opts?.detected || (await (0, detect_1.detectModules)());
    const paths = (0, paths_1.resolvePaths)(detected);
    // choose services from options.services or default set
    const services = opts?.services && opts.services.length ? opts.services : ["a", "b", "c"];
    for (const mod of services) {
        const p = (opts?.modulePaths && opts.modulePaths[mod]) || paths[mod];
        if (!p) {
            logger_1.logger.warn(`${mod} path not found, skipping`);
            continue;
        }
        logger_1.logger.info(`Launching ${mod} from ${p}`);
        const proc = (0, exec_1.spawnSafe)("node", [p], { cwd: p });
        proc.on("exit", (code) => {
            logger_1.logger.info(`${mod} exited with ${code}`);
        });
    }
}
