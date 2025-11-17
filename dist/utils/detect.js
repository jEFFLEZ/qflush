"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectModules = detectModules;
exports.findAndKill = findAndKill;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
async function detectModules() {
    // naive detection: try to find processes by name
    const names = ["a", "b", "c"];
    const out = {};
    for (const n of ["a", "b", "c"])
        out[n] = { running: false };
    await new Promise((resolve) => {
        (0, child_process_1.exec)(process.platform === "win32" ? "tasklist" : "ps aux", (err, stdout) => {
            if (err) {
                logger_1.logger.warn(`Failed to list processes: ${err.message}`);
                return resolve();
            }
            const s = stdout.toString();
            for (const name of names) {
                const regex = new RegExp(name, "i");
                if (regex.test(s)) {
                    out[name].running = true;
                }
            }
            resolve();
        });
    });
    return out;
}
async function findAndKill() {
    // naive: find processes that match names and kill them
    const names = ["a", "b", "c"];
    const killed = [];
    for (const n of names) {
        try {
            if (process.platform === "win32") {
                (0, child_process_1.exec)(`taskkill /IM ${n}.exe /F`, (err) => { });
            }
            else {
                (0, child_process_1.exec)(`pkill -f ${n}`, (err) => { });
            }
        }
        catch (err) {
            // ignore
        }
    }
    return killed;
}
