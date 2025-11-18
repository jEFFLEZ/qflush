// ROME-TAG: 0x3AB4E4

import { logger } from "../utils/logger";
import { findAndKill } from "../utils/detect";
import { stopAll } from "../supervisor";
import { QFlashOptions } from "../chain/smartChain";

export async function runKill(_opts?: QFlashOptions) {
  logger.info("qflash: killing modules...");
  const killed = await findAndKill();
  stopAll();
  logger.info(`Killed ${killed.length} processes`);
}
