#!/usr/bin/env node
import { buildPipeline, executePipeline } from "./chain/smartChain";
import { showHelp } from "./cli/help";
import { runCompose } from "./commands/compose";
import { runDoctor } from "./commands/doctor";
import runNpzInspect from "./commands/npz-inspect";
import runNpzScores from "./commands/npz-scores";

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
    process.exit(1);
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

if (first === 'npz:scores' || (first === 'npz' && argv[1] === 'scores')) {
  (async () => {
    try {
      const args = first === 'npz:scores' ? argv.slice(1) : argv.slice(2);
      const code = await runNpzScores(args);
      process.exit(code ?? 0);
    } catch (err) {
      console.error('npz scores failed', err);
      process.exit(1);
    }
  })();
}

if (first === 'npz:scores:reset' || (first === 'npz' && argv[1] === 'scores:reset')) {
  (async () => {
    try {
      const code = await runNpzScores(['--reset']);
      process.exit(code ?? 0);
    } catch (err) {
      console.error('npz scores reset failed', err);
      process.exit(1);
    }
  })();
}

const { pipeline, options } = buildPipeline(argv);

executePipeline(pipeline, options).catch((err) => {
  console.error("qflash: fatal", err);
  process.exit(1);
});
