"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStart = runStart;
const detect_1 = require("../utils/detect");
const logger_1 = require("../utils/logger");
const exec_1 = require("../utils/exec");
const paths_1 = require("../utils/paths");
const package_1 = require("../utils/package");
const supervisor_1 = require("../supervisor");
const health_1 = require("../utils/health");
async function runStart(opts) {
    logger_1.logger.info("qflash: starting modules...");
    const detected = opts?.detected || (await (0, detect_1.detectModules)());
    const paths = (0, paths_1.resolvePaths)(detected);
    const services = opts?.services && opts.services.length ? opts.services : Object.keys(paths_1.SERVICE_MAP);
    const flags = opts?.flags || {};
    const waitForStart = Boolean(flags["wait"] || flags["--wait"] || false);
    const doRestart = Boolean(flags["restart"] || flags["--restart"] || flags["force"] || false);
    const maxRestarts = typeof flags["restartCount"] === "number" ? flags["restartCount"] : 3;
    const procs = [];
    for (const mod of services) {
        const promise = (async () => {
            const p = (opts?.modulePaths && opts.modulePaths[mod]) || paths[mod];
            const pkg = paths_1.SERVICE_MAP[mod] && paths_1.SERVICE_MAP[mod].pkg;
            // resolve package path (local node_modules or provided path)
            let pkgPath = p;
            if (!pkgPath && pkg)
                pkgPath = (0, package_1.resolvePackagePath)(pkg);
            if (!pkgPath && pkg) {
                const ok = (0, exec_1.ensurePackageInstalled)(pkg);
                if (!ok) {
                    logger_1.logger.warn(`${mod} not found and failed to install ${pkg}, skipping`);
                    return;
                }
                pkgPath = (0, package_1.resolvePackagePath)(pkg);
            }
            if (!pkgPath) {
                logger_1.logger.warn(`${mod} path and package not found, skipping`);
                return;
            }
            const pkgJson = (0, package_1.readPackageJson)(pkgPath);
            // choose how to run: package bin if present, else npx <pkg>
            let runCmd = null;
            if (pkgJson && pkgJson.bin) {
                const binEntry = typeof pkgJson.bin === "string" ? pkgJson.bin : Object.values(pkgJson.bin)[0];
                const binPath = require("path").join(pkgPath, binEntry);
                // prefer running via node when bin is a JS file inside package
                if (binPath.endsWith(".js") && (0, exec_1.pathExists)(binPath)) {
                    runCmd = { cmd: process.execPath, args: [binPath], cwd: pkgPath };
                }
                else if ((0, exec_1.pathExists)(binPath)) {
                    runCmd = { cmd: binPath, args: [], cwd: pkgPath };
                }
                else {
                    logger_1.logger.warn(`${mod} bin entry not found at ${binPath}. ${(0, exec_1.rebuildInstructionsFor)(pkgPath)}`);
                    return;
                }
            }
            else if (pkg) {
                // fallback to npx but warn about potential npx execution failures
                logger_1.logger.warn(`${mod} has no local bin; will run via npx which may fail if package not globally installed.`);
                runCmd = { cmd: "npx", args: [pkg], cwd: process.cwd() };
            }
            if (!runCmd) {
                logger_1.logger.warn(`${mod} has no runnable entry, skipping`);
                return;
            }
            let restarts = 0;
            const spawnOnce = () => {
                return new Promise((resolve) => {
                    logger_1.logger.info(`Launching ${mod} -> ${runCmd.cmd} ${runCmd.args.join(" ")}`);
                    // use supervisor to manage and persist process
                    const child = (0, supervisor_1.startProcess)(mod, runCmd.cmd, runCmd.args, { cwd: runCmd.cwd });
                    if (waitForStart) {
                        // try to wait for a health endpoint if provided in flags
                        const svcUrl = flags["health-url"] || flags["health"];
                        const svcPort = flags["health-port"] || undefined;
                        if (svcUrl) {
                            (0, health_1.waitForService)(svcUrl, svcPort).then((ok) => {
                                if (ok)
                                    logger_1.logger.success(`${mod} passed health check`);
                                else
                                    logger_1.logger.warn(`${mod} failed health check`);
                                resolve();
                            });
                        }
                        else {
                            // wait for spawn via PID persistence
                            setTimeout(() => {
                                logger_1.logger.info(`${mod} started (delayed wait).`);
                                resolve();
                            }, 2000);
                        }
                    }
                    else {
                        resolve();
                    }
                    // child exit handled by supervisor
                });
            };
            // start the first time and optionally wait
            await spawnOnce();
            // restart logic handled by supervisor-level events, keep simple here
        })();
        procs.push(promise);
    }
    await Promise.all(procs);
    logger_1.logger.success("qflash: start sequence initiated for selected modules");
}
