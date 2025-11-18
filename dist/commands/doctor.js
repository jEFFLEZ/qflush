"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDoctor = runDoctor;
const logger_1 = require("../utils/logger");
const detect_1 = require("../utils/detect");
const health_1 = require("../utils/health");
const paths_1 = require("../utils/paths");
const exec_1 = require("../utils/exec");
async function runDoctor(argv = []) {
    const fix = argv.includes('--fix') || argv.includes('-f');
    logger_1.logger.info('qflash: running doctor checks...');
    const detected = await (0, detect_1.detectModules)();
    for (const k of Object.keys(detected)) {
        const v = detected[k];
        logger_1.logger.info(`${k}: installed=${v.installed} running=${v.running} path=${v.path || 'n/a'}`);
        if (v.bin && v.path) {
            logger_1.logger.info(`  bin: ${v.bin}`);
        }
    }
    // check node version
    logger_1.logger.info(`Node version: ${process.version}`);
    // simple http check example
    const httpOk = await (0, health_1.httpProbe)('http://localhost:80', 500);
    logger_1.logger.info(`HTTP localhost:80 reachable: ${httpOk}`);
    if (fix) {
        logger_1.logger.info('Doctor fix: attempting to install missing Funeste38 packages...');
        for (const name of Object.keys(paths_1.SERVICE_MAP)) {
            const pkg = paths_1.SERVICE_MAP[name].pkg;
            const detectedInfo = detected[name];
            if (!detectedInfo || !detectedInfo.installed) {
                logger_1.logger.info(`Installing ${pkg} for service ${name}...`);
                const ok = (0, exec_1.ensurePackageInstalled)(pkg);
                if (ok)
                    logger_1.logger.success(`Installed ${pkg}`);
                else
                    logger_1.logger.warn(`Failed to install ${pkg}`);
            }
            else {
                logger_1.logger.info(`${pkg} already installed`);
            }
        }
    }
    logger_1.logger.info('Doctor checks complete');
}
