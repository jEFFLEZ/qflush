import { detectModules } from "../utils/detect";
import { logger } from "../utils/logger";
import { spawnSafe, ensurePackageInstalled } from "../utils/exec";
import { resolvePaths, SERVICE_MAP } from "../utils/paths";
import { QFlashOptions } from "../chain/smartChain";
import { resolvePackagePath, readPackageJson } from "../utils/package";
import { startProcess } from "../supervisor";
import { waitForService } from "../utils/health";
import { runCustomsCheck, hasBlockingIssues, ModuleDescriptor } from "../utils/npz-customs";

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

    // resolve package path (local node_modules or provided path)
    let pkgPath = p;
    if (!pkgPath && pkg) pkgPath = resolvePackagePath(pkg);

    if (!pkgPath && pkg) {
      const ok = ensurePackageInstalled(pkg);
      if (!ok) {
        logger.warn(`${modName} not found and failed to install ${pkg}, skipping`);
        return;
      }
      pkgPath = resolvePackagePath(pkg);
    }

    if (!pkgPath) {
      logger.warn(`${modName} path and package not found, skipping`);
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
      logger.warn(`${modName} has no runnable entry, skipping`);
      return;
    }

    logger.info(`Launching ${modName} -> ${runCmd.cmd} ${runCmd.args.join(" ")}`);
    const child = startProcess(modName, runCmd.cmd, runCmd.args, { cwd: runCmd.cwd });

    if (waitForStart) {
      const svcUrl = flags["health-url"] || flags["health"];
      const svcPort = flags["health-port"] || undefined;
      if (svcUrl) {
        waitForService(svcUrl as string, svcPort as any).then((ok) => {
          if (ok) logger.success(`${modName} passed health check`);
          else logger.warn(`${modName} failed health check`);
        });
      } else {
        setTimeout(() => {
          logger.info(`${modName} started (delayed wait).`);
        }, 2000);
      }
    }
  }

  for (const mod of services) {
    const promise = (async () => {
      await startWithCustoms(mod);
    })();
    procs.push(promise);
  }

  await Promise.all(procs);

  logger.success("qflash: start sequence initiated for selected modules");
}
