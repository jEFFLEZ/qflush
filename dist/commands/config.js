"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runConfig = runConfig;
const fs_1 = require("fs");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
async function runConfig(opts) {
    logger_1.logger.info("qflash: generating default configs...");
    const detected = opts?.detected || {};
    const paths = (0, paths_1.resolvePaths)(detected);
    for (const key of Object.keys(paths)) {
        const p = paths[key];
        if (!p)
            continue;
        const envFile = `${p}/.env`;
        try {
            await fs_1.promises.access(envFile);
            logger_1.logger.info(`${key}: .env already exists`);
        }
        catch {
            const content = `# ${key} default env\nPORT=3000\nTOKEN=changeme\n`;
            await fs_1.promises.mkdir(p, { recursive: true });
            await fs_1.promises.writeFile(envFile, content, { encoding: "utf8" });
            logger_1.logger.success(`Created ${envFile}`);
        }
    }
}
