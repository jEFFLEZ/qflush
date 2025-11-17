<<<<<<< HEAD
﻿// ROME-TAG: 0x263C6D

import { logger } from "../utils/logger";
import { resolvePaths } from "../utils/paths";
import { rimrafSync } from "../utils/exec";
import { clearState } from "../supervisor";
import { qflushOptions } from "../chain/smartChain";

export async function runPurge(opts?: qflushOptions) {
  logger.info("qflush: purging caches, logs, sessions and supervisor state...");
=======
import { logger } from "../utils/logger";
import { resolvePaths } from "../utils/paths";
import { rimrafSync } from "../utils/exec";
import { QFlashOptions } from "../chain/smartChain";

export async function runPurge(opts?: QFlashOptions) {
  logger.info("qflash: purging caches, logs, sessions...");
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
  const paths = resolvePaths(opts?.detected || {});
  const targets = [] as string[];
  for (const key of Object.keys(paths)) {
    const p = paths[key];
    if (!p) continue;
    targets.push(`${p}/.cache`);
    targets.push(`${p}/logs`);
    targets.push(`${p}/tmp`);
    targets.push(`${p}/sessions`);
  }
  for (const t of targets) {
    try {
      rimrafSync(t);
      logger.success(`Removed ${t}`);
    } catch (err) {
      logger.warn(`Failed to remove ${t}: ${err}`);
    }
  }
<<<<<<< HEAD
  // clear supervisor state
  clearState();
  logger.info("Purge complete.");
}

=======
  logger.info("Purge complete.");
}
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
