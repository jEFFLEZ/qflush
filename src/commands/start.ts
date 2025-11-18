import { detectModules } from "../utils/detect";
import logger from "../utils/logger";
import { spawnSafe, ensurePackageInstalled } from "../utils/exec";
import { resolvePaths, SERVICE_MAP } from "../utils/paths";
import { QFlashOptions } from "../chain/smartChain";
import { resolvePackagePath, readPackageJson } from "../utils/package";
import { startProcess } from "../supervisor";
import { waitForService } from "../utils/health";
import { runCustomsCheck, hasBlockingIssues, ModuleDescriptor } from "../utils/npz-customs";
import npz from "../utils/npz";

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

    // resolve using NPZ Joker as primary resolver
    let resolverTarget = p || (pkg ? undefined : undefined);
    let resolved = null as any;
    if (p) {
      // if path provided, try to use it directly
      try {
        const pkgJson = readPackageJson(p);
        if (pkgJson) resolved = { gate: 'green', cmd: require('path').join(p, (typeof pkgJson.bin === 'string' ? pkgJson.bin : Object.values(pkgJson.bin || {})[0]) || ''), args: [], cwd: p };
      } catch {}
    }

    if (!resolved && pkg) {
      resolved = npz.npzResolve(pkg, { cwd: p || process.cwd() });
    }

    if (!resolved || resolved.gate === 'fail') {
      logger.warn(`${modName} path and package not found or NPZ failed to resolve, skipping`);
      return;
    }

    // If gate is dlx and we don't have the package locally, ensure installed if desired
    if (resolved.gate === 'dlx' && pkg) {
      const ok = ensurePackageInstalled(pkg);
      if (!ok) {
        logger.warn(`${modName} not found and failed to install ${pkg}, skipping`);
        return;
      }
    }

    const runCmd = { cmd: resolved.cmd, args: resolved.args || [], cwd: resolved.cwd };

    logger.info(`Launching ${modName} -> ${runCmd.cmd} ${runCmd.args.join(" ")}`);
    const child = startProcess(modName, runCmd.cmd as string, runCmd.args, { cwd: runCmd.cwd });

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
