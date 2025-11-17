import { detectModules } from "../utils/detect";
import { logger } from "../utils/logger";
import { spawnSafe, ensurePackageInstalled } from "../utils/exec";
import { resolvePaths, SERVICE_MAP } from "../utils/paths";
import { QFlashOptions } from "../chain/smartChain";
import { resolvePackagePath, readPackageJson } from "../utils/package";

export async function runStart(opts?: QFlashOptions) {
  logger.info("qflash: starting modules...");
  const detected = opts?.detected || (await detectModules());
  const paths = resolvePaths(detected);

  const services = opts?.services && opts.services.length ? opts.services : Object.keys(SERVICE_MAP);
  const flags = opts?.flags || {};

  const waitForStart = Boolean(flags["wait"] || flags["--wait"] || false);
  const doRestart = Boolean(flags["restart"] || flags["--restart"] || flags["force"] || false);
  const maxRestarts = typeof flags["restartCount"] === "number" ? (flags["restartCount"] as number) : 3;

  const procs: Promise<void>[] = [];

  for (const mod of services) {
    const promise = (async () => {
      const p = (opts?.modulePaths && opts.modulePaths[mod]) || paths[mod];
      const pkg = SERVICE_MAP[mod] && SERVICE_MAP[mod].pkg;

      // resolve package path (local node_modules or provided path)
      let pkgPath = p;
      if (!pkgPath && pkg) pkgPath = resolvePackagePath(pkg);

      if (!pkgPath && pkg) {
        const ok = ensurePackageInstalled(pkg);
        if (!ok) {
          logger.warn(`${mod} not found and failed to install ${pkg}, skipping`);
          return;
        }
        pkgPath = resolvePackagePath(pkg);
      }

      if (!pkgPath) {
        logger.warn(`${mod} path and package not found, skipping`);
        return;
      }

      const pkgJson = readPackageJson(pkgPath);

      // choose how to run: package bin if present, else npx <pkg>
      let runCmd: { cmd: string; args: string[]; cwd?: string } | null = null;
      if (pkgJson && pkgJson.bin) {
        const binEntry = typeof pkgJson.bin === "string" ? pkgJson.bin : Object.values(pkgJson.bin)[0];
        const binPath = require("path").join(pkgPath, binEntry);
        runCmd = { cmd: binPath, args: [], cwd: pkgPath };
      } else if (pkg) {
        runCmd = { cmd: "npx", args: [pkg], cwd: process.cwd() };
      }

      if (!runCmd) {
        logger.warn(`${mod} has no runnable entry, skipping`);
        return;
      }

      let restarts = 0;

      const spawnOnce = (): Promise<void> => {
        return new Promise((resolve) => {
          logger.info(`Launching ${mod} -> ${runCmd!.cmd} ${runCmd!.args.join(" ")}`);
          const child = spawnSafe(runCmd!.cmd, runCmd!.args, { cwd: runCmd!.cwd });

          if (waitForStart) {
            // resolve when the process has spawned
            child.once("spawn", () => {
              logger.info(`${mod} spawned (pid=${child.pid})`);
              resolve();
            });
            // fallback timeout
            setTimeout(() => {
              logger.info(`${mod} wait timeout elapsed, continuing`);
              resolve();
            }, 3000);
          } else {
            // resolve immediately (we started the process)
            resolve();
          }

          child.on("exit", (code) => {
            logger.warn(`${mod} exited with ${code}`);
            if (doRestart && restarts < maxRestarts) {
              restarts += 1;
              logger.info(`${mod}: restarting (${restarts}/${maxRestarts}) in 1s`);
              setTimeout(() => spawnOnce(), 1000);
            }
          });
        });
      };

      // start the first time and optionally wait
      await spawnOnce();
    })();

    procs.push(promise);
  }

  // wait for all to have been started (if waitForStart true, spawnOnce resolves after spawn)
  await Promise.all(procs);

  logger.success("qflash: start sequence initiated for selected modules");
}
