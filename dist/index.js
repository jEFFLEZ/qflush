#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smartChain_1 = require("./chain/smartChain");
const help_1 = require("./cli/help");
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
    (0, help_1.showHelp)();
    process.exit(0);
}
const { pipeline, options } = (0, smartChain_1.buildPipeline)(argv);
(0, smartChain_1.executePipeline)(pipeline, options).catch((err) => {
    console.error("qflash: fatal", err);
    process.exit(1);
});
