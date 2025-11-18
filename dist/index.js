#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const smartChain_1 = require("./chain/smartChain");
const help_1 = require("./cli/help");
const compose_1 = require("./commands/compose");
const doctor_1 = require("./commands/doctor");
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
    (0, help_1.showHelp)();
    process.exit(0);
}
const first = argv[0];
if (first === 'compose') {
    void (0, compose_1.runCompose)(argv.slice(1));
    process.exit(0);
}
if (first === 'doctor') {
    void (0, doctor_1.runDoctor)(argv.slice(1));
    process.exit(0);
}
if (first === 'daemon') {
    // start qflashd in-process
    void Promise.resolve().then(() => __importStar(require('./daemon/qflashd'))).then((m) => {
        // module starts itself and logs
    }).catch((err) => { console.error('failed to start daemon', err); process.exit(1); });
    process.exit(0);
}
const { pipeline, options } = (0, smartChain_1.buildPipeline)(argv);
(0, smartChain_1.executePipeline)(pipeline, options).catch((err) => {
    console.error("qflash: fatal", err);
    process.exit(1);
});
