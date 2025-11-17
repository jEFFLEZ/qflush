<<<<<<< HEAD
// ROME-TAG: 0x1DEEBD

import { logger } from "../utils/logger";

export function showHelp() {
  logger.info(`qflush - Funesterie orchestrator`);
  console.log(`
Usage:
  qflush [command] [options]
=======
import { logger } from "../utils/logger";

export function showHelp() {
  logger.info(`qflash - Funesterie orchestrator`);
  console.log(`
Usage:
  qflash [command] [options]
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)

Commands:
  start        Launch selected services (default: detect → config → start)
  kill         Kill running services
  purge        Clear caches, logs and sessions
  inspect      Show running services and ports
  config       Generate missing .env/config files
<<<<<<< HEAD
  secret import  Import secrets from a .env file into local encrypted store (Windows DPAPI)

Options (examples):
  --service rome --path D:/rome --token ABC123     Target a specific service and give path/token
  --service nezlephant --service freeland          Target multiple services
  --dev --fresh                                    Global flags (dev mode, fresh start)
  --force                                          Force restart semantics (implies kill before start)

Examples:
  qflush start --service rome --path D:/rome
  qflush start --service nezlephant --service freeland --fresh
  qflush config --service freeland
  qflush purge --fresh

Scripts & helpers:
  node scripts/detach.js [--quiet] <command>   # spawn detached process (use --quiet to suppress output)
  ./scripts/run-with-timeout.sh <sec> <cmd>    # run command with timeout (POSIX)
  pwsh ./scripts/run-with-timeout.ps1 -Cmd "node dist/index.js start" -TimeoutSec 12  # PowerShell watchdog (quiet by default)
  qflush secret import [--env <path>] [--no-acl]   # import .env and store encrypted locally
=======
  exodia       EXODIA protocol (future)

Options (examples):
  --service a --path D:/A --token ABC123   Target a specific service and give path/token
  --service a --service b                  Target multiple services
  --dev --fresh                            Global flags (dev mode, fresh start)

Examples:
  qflash start
  qflash start --service a --path D:/A
  qflash config --service b
  qflash purge --fresh
>>>>>>> 9c20528 (chore(qflash): initial scaffold, smartchain, installers, CI)

`);
}
