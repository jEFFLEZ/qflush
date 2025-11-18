#!/usr/bin/env node
import { buildPipeline, executePipeline } from "./chain/smartChain";
import { showHelp } from "./cli/help";
import { runCompose } from "./commands/compose";
import { runDoctor } from "./commands/doctor";
import runNpzInspect from "./commands/npz-inspect";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

const first = argv[0];
if (first === 'compose') {
  void runCompose(argv.slice(1));
  process.exit(0);
}
if (first === 'doctor') {
  void runDoctor(argv.slice(1));
  process.exit(0);
}
if (first === 'daemon') {
  // start qflashd in-process
  void import('./daemon/qflashd').then((m) => {
    // module starts itself and logs
  }).catch((err) => { console.error('failed to start daemon', err); process.exit(1); });
  process.exit(0);
}

// NPZ inspect command: `qflash npz:inspect <id>` or `qflash npz inspect <id>`
if (first === 'npz:inspect' || (first === 'npz' && argv[1] === 'inspect')) {
  const id = first === 'npz:inspect' ? argv[1] : argv[2];
  if (!id) {
    console.error('usage: qflash npz:inspect <npz_id>');
// `npz inspect` command implementation
// prints info about specified NPZ file
// resolves to exit code
//
// optionally takes one or two arguments:
//
// <id>              NPZ id (required)
// --raw             raw JSON output
//
// if <id> is not provided, prints help and exits with code 1
//
// example:
//   qflash npz:inspect my-npz-id
//
// returns code 0 on success, 1 if help is shown, 2 if NPZ not found
//
// note: this command is internal and subject to change
//
// import { printHelp } from '../help";
// import { findNpz, printNpz } from "../../npz/npz";
//
// export default async function npzInspect(argv: string[]): Promise<number | void> {
//
//   let raw = false;
//   const args = argv.filter((a) => {
//     if (a === '--raw') { raw = true; return false; }
//     return true;
//   });
//
//   const id = args[0];
//   if (!id) {
//     printHelp();
//     return 1;
//   }
//  `process.exit(1);
  }
  // run and exit with returned code
  (async () => {
    try {
      const code = await runNpzInspect(id);
      process.exit(code ?? 0);
    } catch (err) {
      console.error('npz inspect failed', err);
      process.exit(1);
    }
  })();
}

const { pipeline, options } = buildPipeline(argv);

executePipeline(pipeline, options).catch((err) => {
  console.error("qflash: fatal", err);
  process.exit(1);
});
