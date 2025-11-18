import { buildPipeline, executePipeline } from "./chain/smartChain";
import { showHelp } from "./cli/help";
import { runCompose } from "./commands/compose";
import { runDoctor } from "./commands/doctor";
import runNpzInspect from "./commands/npz-inspect";
import runNpzScores from "./commands/npz-scores";
import { runLicense } from "./commands/license";
import runChecksum from "./commands/checksum";
import runEngine from "./commands/engine";
import runLogic from "./commands/logic";
import runCopilot from "./commands/copilot";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

const first = argv[0];
if (first === "compose") {
  void runCompose(argv.slice(1));
  process.exit(0);
}
if (first === "doctor") {
  void runDoctor(argv.slice(1));
  process.exit(0);
}
if (first === "daemon") {
  // start qflushd in-process
  void import("./daemon/qflushd").then(() => {
    // module starts itself and logs
  }).catch((err) => {
    console.error("failed to start daemon", err);
    process.exit(1);
  });
  process.exit(0);
}

if (first === 'engine') {
  (async () => {
    const code = await runEngine(argv.slice(1));
    process.exit(code ?? 0);
  })();
}

if (first === 'logic') {
  (async () => {
    const code = await runLogic(argv.slice(1));
    process.exit(code ?? 0);
  })();
}

if (first === 'copilot') {
  (async () => {
    const code = await runCopilot(argv.slice(1));
    process.exit(code ?? 0);
  })();
}

if (first === 'license' || (first === 'lic' && argv[1] === 'activate')) {
  (async () => {
    const code = await runLicense(argv.slice(1));
    process.exit(code ?? 0);
  })();
}

if (first === 'checksum') {
  (async () => {
    const code = await runChecksum(argv.slice(1));
    process.exit(code ?? 0);
  })();
}

// NPZ inspect command: `qflush npz:inspect <id>` or `qflush npz inspect <id>`
if (first === "npz:inspect" || (first === "npz" && argv[1] === "inspect")) {
  const id = first === "npz:inspect" ? argv[1] : argv[2];
  if (!id) {
    console.error("usage: qflush npz:inspect <npz_id>");
    process.exit(1);
  }
  // run and exit with returned code
  (async () => {
    try {
      const code = await runNpzInspect(id);
      process.exit(code ?? 0);
    } catch (err) {
      console.error("npz inspect failed", err);
      process.exit(1);
    }
  })();
}

if (first === "npz:scores" || (first === "npz" && argv[1] === "scores")) {
  (async () => {
    try {
      const args = first === "npz:scores" ? argv.slice(1) : argv.slice(2);
      const code = await runNpzScores(args);
      process.exit(code ?? 0);
    } catch (err) {
      console.error("npz scores failed", err);
      process.exit(1);
    }
  })();
}

if (first === "npz:scores:reset" || (first === "npz" && argv[1] === "scores:reset")) {
  (async () => {
    try {
      const code = await runNpzScores(["--reset"]);
      process.exit(code ?? 0);
    } catch (err) {
      console.error("npz scores reset failed", err);
      process.exit(1);
    }
  })();
}

const { pipeline, options } = buildPipeline(argv);

executePipeline(pipeline, options).catch((err) => {
  console.error("qflush: fatal", err);
  process.exit(1);
});
