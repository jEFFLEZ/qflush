"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePaths = resolvePaths;
const fs_1 = require("fs");
const path_1 = require("path");
const CANDIDATES = {
    a: ["./a", "./A"],
    b: ["./b", "./B"],
    c: ["./c", "./C"],
};
function resolvePaths(detected = {}) {
    const out = {};
    for (const key of Object.keys(CANDIDATES)) {
        if (detected && detected[key] && detected[key].path) {
            out[key] = detected[key].path;
            continue;
        }
        const tries = CANDIDATES[key];
        for (const t of tries) {
            const p = (0, path_1.join)(process.cwd(), t);
            if ((0, fs_1.existsSync)(p)) {
                out[key] = p;
                break;
            }
        }
    }
    return out;
}
