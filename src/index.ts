// ROME-TAG: 0x2A0018

// Register global error handlers early to avoid the CLI crashing on unhandled errors (redis, etc.)
process.on('unhandledRejection', (reason) => {
  try { console.warn('Unhandled Rejection:', reason && (reason as any).stack ? (reason as any).stack : String(reason)); } catch { /* ignore */ }
});
process.on('uncaughtException', (err) => {
  try { console.error('Uncaught Exception:', err && (err as any).stack ? (err as any).stack : String(err)); } catch { /* ignore */ }
});

// Early exit for version/about flags to avoid importing modules with side-effects.
const _argv = process.argv.slice(2);
if (_argv.includes('--version') || _argv.includes('-v')) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    if (pkg && pkg.version) console.log(pkg.version);
    else console.log('unknown');
  } catch (e) { console.log('unknown'); }
  process.exit(0);
}
if (_argv.includes('--about') || _argv.includes('-a')) {
  try {
    const pkg = require('../package.json');
    console.log(`${pkg.name} - ${pkg.description}\nversion ${pkg.version}`);
  } catch (e) { console.log('qflush - Funesterie orchestrator'); }
  process.exit(0);
}
if (_argv.includes('--upgrade')) {
  // simple upgrade helper: attempt to npm install -g the same package name
  console.log('Attempting upgrade...');
  const { spawnSync } = require('child_process');
  const res = spawnSync('npm', ['install', '-g', '@funeste38/qflush@latest'], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

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
import runCopilotBridge from "./commands/copilot-bridge";
import runRomeLinks from "./commands/rome-links";
import runA11 from "./commands/a11";
import runSpyder from "./commands/spyder";
import { spawn } from 'child_process';

// Only run the CLI dispatch when this module is the entrypoint
declare const require: any;
if (typeof require !== 'undefined' && require.main === module) {
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
    // Default to detached mode to avoid launching heavy in-process work (opens files, scanners).
    // Pass `--no-detach` to run in-process explicitly.
    const detached = argv.includes('--detached') || !argv.includes('--no-detach');
    if (!argv.includes('--detached') && !argv.includes('--no-detach')) {
      console.log('qflush: starting daemon in detached mode by default (use --no-detach to run in-process)');
    }
    if (detached) {
      try {
        // attempt to use @funeste38/bat to spawn detached
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bat = require('@funeste38/bat');
        if (bat && typeof bat.spawn === 'function') {
          bat.spawn('qflushd', process.execPath, ['dist/daemon/qflushd.js']);
          console.log('qflushd spawned detached via bat');
          process.exit(0);
        }
      } catch (e) {
        // fallback to detached child process
        try {
          const child = spawn(process.execPath, ['dist/daemon/qflushd.js'], { detached: true, stdio: 'ignore' });
          child.unref();
          console.log('qflushd spawned detached (fallback)');
          process.exit(0);
        } catch (err) {
          console.error('failed to spawn detached daemon', err);
          process.exit(1);
        }
      }
    }
    // start qflushd in-process
    void import("./daemon/qflushd.js").then(() => {
      // module starts itself and logs
    }).catch((err) => {
      console.error("failed to start daemon", err);
      process.exit(1);
    });
    process.exit(0);
  }

  if (first === 'a11' || first === 'a11:status') {
    (async () => {
      const code = await runA11(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'spyder' || first === 'spyder:status' || first === 'spyder:mem') {
    (async () => {
      const code = await runSpyder(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'engine' ) {
    (async () => {
      const code = await runEngine(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'logic' ) {
    (async () => {
      const code = await runLogic(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'copilot' ) {
    (async () => {
      const code = await runCopilot(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'copilot-bridge' ) {
    (async () => {
      const code = await runCopilotBridge(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'license' || (first === 'lic' && argv[1] === 'activate')) {
    (async () => {
      const code = await runLicense(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'checksum' && argv[1]) {
    (async () => {
      const code = await runChecksum(argv.slice(1));
      process.exit(code ?? 0);
    })();
  }

  if (first === 'rome:links' || (first === 'rome' && argv[1] === 'links')) {
    (async () => {
      const code = await runRomeLinks(argv.slice(1));
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
}
