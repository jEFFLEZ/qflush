"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showHelp = showHelp;
const logger_1 = require("../utils/logger");
function showHelp() {
    logger_1.logger.info(`qflash - Funesterie orchestrator`);
    console.log(`
Usage:
  qflash [command] [options]

Commands:
  start        Launch selected services (default: detect → config → start)
  kill         Kill running services
  purge        Clear caches, logs and sessions
  inspect      Show running services and ports
  config       Generate missing .env/config files
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

`);
}
