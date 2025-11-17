<<<<<<< HEAD
﻿// ROME-TAG: 0x130555

import { promises as fs } from "fs";
import { logger } from "../utils/logger";
import { resolvePaths } from "../utils/paths";
import { qflushOptions } from "../chain/smartChain";

export async function runConfig(opts?: qflushOptions) {
  logger.info("qflush: generating default configs...");
=======
import { promises as fs } from "fs";
import { logger } from "../utils/logger";
import { resolvePaths } from "../utils/paths";
import { QFlashOptions } from "../chain/smartChain";

export async function runConfig(opts?: QFlashOptions) {
  logger.info("qflash: generating default configs...");
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
  const detected = opts?.detected || {};
  const paths = resolvePaths(detected);
  for (const key of Object.keys(paths)) {
    const p = paths[key];
    if (!p) continue;
    const envFile = `${p}/.env`;
    try {
      await fs.access(envFile);
      logger.info(`${key}: .env already exists`);
    } catch {
      const content = `# ${key} default env\nPORT=3000\nTOKEN=changeme\n`;
      await fs.mkdir(p, { recursive: true });
      await fs.writeFile(envFile, content, { encoding: "utf8" });
      logger.success(`Created ${envFile}`);
    }
  }
}
<<<<<<< HEAD

=======
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)
