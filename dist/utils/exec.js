"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnSafe = spawnSafe;
exports.rimrafSync = rimrafSync;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
const fs_1 = require("fs");
function spawnSafe(command, args = [], opts = {}) {
    try {
        const proc = (0, child_process_1.spawn)(command, args, { stdio: "inherit", shell: true, ...opts });
        proc.on("error", (err) => logger_1.logger.error(`Process error: ${err.message}`));
        return proc;
    }
    catch (err) {
        logger_1.logger.error(`Failed to spawn ${command}: ${err.message}`);
        throw err;
    }
}
function rimrafSync(path) {
    if (!path)
        return;
    if (!(0, fs_1.existsSync)(path))
        return;
    try {
        (0, fs_1.rmSync)(path, { recursive: true, force: true });
    }
    catch (err) {
        // fallback
        try {
            (0, fs_1.unlinkSync)(path);
        }
        catch { }
    }
}
