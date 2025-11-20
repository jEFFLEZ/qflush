// ROME-TAG: 0xF73710

import { detectModules } from "../utils/detect";
import logger from "../utils/logger";
import { spawnSafe, ensurePackageInstalled, pathExists, rebuildInstructionsFor } from "../utils/exec";
import { resolvePaths, SERVICE_MAP } from "../utils/paths";
import { qflushOptions } from "../chain/smartChain";
import { resolvePackagePath, readPackageJson } from "../utils/package";
import { startProcess } from "../supervisor";
import { waitForService } from "../utils/health";
import { runCustomsCheck, hasBlockingIssues, ModuleDescriptor } from "../utils/npz-customs";
import npz from "../utils/npz";

export async function runStart(opts?: qflushOptions) {
  logger.info("qflush: starting modules...");
  const detected = opts?.detected || (await detectModules());
  const paths = resolvePaths(detected);

  const services = opts?.services && opts.services.length ? opts.services : Object.keys(SERVICE_MAP);
  const flags = opts?.flags || {};

  const waitForStart = Boolean(flags["wait"] || flags["--wait"] || false);
  const doRestart = Boolean(flags["restart"] || flags["--restart"] || flags["force"] || false);
  const maxRestarts = typeof flags["restartCount"] === "number" ? (flags["restartCount"] as number) : 3;

  const procs: Promise<void>[] = [];

  async function startWithCustoms(modName: string) {
    const p = (opts?.modulePaths && opts.modulePaths[modName]) || paths[modName];
    const pkg = SERVICE_MAP[modName] && SERVICE_MAP[modName].pkg;

    const modDesc: ModuleDescriptor = { name: modName, pkg, cwd: p || process.cwd() };

    // run customs
    const report = await runCustomsCheck(modDesc);
    if (hasBlockingIssues(report)) {
      logger.warn(`supervisor: ${modName} blocked at customs, not starting.`);
      return;
    }

    // if an explicit path is provided, prefer to run it directly
    if (p) {
      try {
        const pkgJson = readPackageJson(p);
        if (pkgJson && pkgJson.bin) {
          const binEntry = typeof pkgJson.bin === "string" ? pkgJson.bin : Object.values(pkgJson.bin)[0];
          const binPath = require("path").join(p, binEntry);
          const runCmd = pathExists(binPath) && binPath.endsWith('.js') ? { cmd: process.execPath, args: [binPath], cwd: p } : { cmd: binPath, args: [], cwd: p };
          logger.info(`Launching ${modName} -> ${runCmd.cmd} ${runCmd.args.join(" ")}`);
          startProcess(modName, runCmd.cmd, runCmd.args, { cwd: runCmd.cwd });
          return;
        }
      } catch (e) {
        logger.warn(`Failed to run local path for ${modName}: ${e}`);
      }
    }

    // otherwise, use NPZ resolver as primary
    if (pkg) {
      const resolved = npz.npzResolve(pkg, { cwd: p || process.cwd() });
      if (!resolved || resolved.gate === 'fail') {
        logger.warn(`${modName} path and package not found or NPZ failed to resolve, skipping`);
        return;
      }

      if (resolved.gate === 'dlx') {
        const ok = ensurePackageInstalled(pkg);
        if (!ok) {
          logger.warn(`${modName} not found and failed to install ${pkg}, skipping`);
          return;
        }
      }

      const runCmd = { cmd: resolved.cmd as string, args: resolved.args || [], cwd: resolved.cwd };
      logger.info(`Launching ${modName} -> ${runCmd.cmd} ${runCmd.args.join(" ")}`);
      startProcess(modName, runCmd.cmd, runCmd.args, { cwd: runCmd.cwd });
      return;
    }

    logger.warn(`${modName} has no runnable entry, skipping`);
  }

  for (const mod of services) {
    const promise = (async () => {
      // Use enhanced master flow which handles missing local bins and robust spawn
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
        // fallback to customs+npz flow
        await startWithCustoms(mod);
        return;
      }

      const pkgJson = readPackageJson(pkgPath);

      // choose how to run: package bin if present, else npz resolver
      let runCmd: { cmd: string; args: string[]; cwd?: string } | null = null;
      if (pkgJson && pkgJson.bin) {
        const binEntry = typeof pkgJson.bin === "string" ? pkgJson.bin : Object.values(pkgJson.bin)[0];
        const binPath = require("path").join(pkgPath, binEntry);

        // prefer running via node when bin is a JS file inside package
        if (binPath.endsWith(".js") && pathExists(binPath)) {
          runCmd = { cmd: process.execPath, args: [binPath], cwd: pkgPath };
        } else if (pathExists(binPath)) {
          runCmd = { cmd: binPath, args: [], cwd: pkgPath };
        } else {
          logger.warn(`${mod} bin entry not found at ${binPath}. ${rebuildInstructionsFor(pkgPath)}`);
          return;
        }
      } else if (pkg) {
        // fallback to npz resolver
        const resolved = npz.npzResolve(pkg, { cwd: pkgPath });
        if (!resolved || resolved.gate === 'fail') {
          logger.warn(`${mod} has no runnable entry, skipping`);
          return;
        }
        runCmd = { cmd: resolved.cmd as string, args: resolved.args || [], cwd: resolved.cwd };
      }

      if (!runCmd) {
        logger.warn(`${mod} has no runnable entry, skipping`);
        return;
      }

      const restarts = 0;

      const spawnOnce = (): Promise<void> => {
        return new Promise((resolve) => {
          logger.info(`Launching ${mod} -> ${runCmd!.cmd} ${runCmd!.args.join(" ")}`);

          // use supervisor to manage and persist process
          const child = startProcess(mod, runCmd!.cmd, runCmd!.args, { cwd: runCmd!.cwd });

          if (waitForStart) {
            // try to wait for a health endpoint if provided in flags
            const svcUrl = flags["health-url"] || flags["health"];
            const svcPort = flags["health-port"] || undefined;
            if (svcUrl) {
              waitForService(svcUrl as string, svcPort as any).then((ok) => {
                if (ok) logger.success(`${mod} passed health check`);
                else logger.warn(`${mod} failed health check`);
                resolve();
              });
            } else {
              // wait for spawn via PID persistence
              setTimeout(() => {
                logger.info(`${mod} started (delayed wait).`);
                resolve();
              }, 2000);
            }
          } else {
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

  logger.success("qflush: start sequence initiated for selected modules");
}

