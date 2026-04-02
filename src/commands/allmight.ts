import path from "node:path";
import {
  analyzePublishDoctor,
  analyzeRepoFamilies,
  applySafePatches,
  scanDuplicateFamilies,
  writeDoctorArtifacts,
  writeMultiRootArtifacts,
  writeReportArtifacts
} from "@funeste38/allmight";
import { logger } from "../utils/logger.js";

type ParsedArgs = {
  command: string;
  positional: string[];
  outputDir: string;
};

function usage() {
  logger.info([
    "usage: qflush allmight <scan|report|propose|fix-safe|canonicalize|multi-scan|doctor> [args] [--output <dir>]",
    "example: qflush allmight propose D:/SPYDER --output .qflush/allmight/spyder",
    "example: qflush allmight multi-scan D:/funesterie/a11/a11qflushrailway D:/qflush D:/envaptex",
    "example: qflush allmight doctor publish D:/qflush",
  ].join("\n"));
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional = argv.filter((arg, index) => !(arg === "--output" || argv[index - 1] === "--output") && !arg.startsWith("--output="));
  const outputIndex = argv.indexOf("--output");
  const inlineOutput = argv.find((arg) => arg.startsWith("--output="));
  const outputDir = outputIndex !== -1
    ? argv[outputIndex + 1] ?? ""
    : inlineOutput
      ? inlineOutput.slice("--output=".length)
      : "";
  const command = positional[0] ?? "scan";
  const label = command === "multi-scan"
    ? "multi-scan"
    : command === "doctor"
      ? `doctor-${positional[1] ?? "publish"}`
      : path.basename(positional[1] ? path.resolve(positional[1]) : process.cwd()) || "repo";
  return {
    command,
    positional,
    outputDir: outputDir
      ? path.resolve(outputDir)
      : path.resolve(process.cwd(), ".qflush", "allmight", label),
  };
}

async function writeArtifactsFor(root: string, outputDir: string) {
  const report = await scanDuplicateFamilies(root, { outputDir });
  await writeReportArtifacts(report, outputDir);
  return report;
}

export default async function runAllmight(argv: string[] = []) {
  const { command, positional, outputDir } = parseArgs(argv);

  if (command === "multi-scan") {
    const roots = positional.slice(1).map((root) => path.resolve(root));
    if (roots.length === 0) {
      usage();
      return 1;
    }
    logger.info(`allmight: multi-scan ${roots.length} roots`);
    const report = await analyzeRepoFamilies(roots);
    await writeMultiRootArtifacts(report, outputDir);
    logger.info(`allmight: repo families=${report.repoFamilies.length} commandShadows=${report.commandShadows.length}`);
    logger.info(`allmight: artifacts -> ${outputDir}`);
    return 0;
  }

  if (command === "doctor") {
    const mode = positional[1];
    if (!mode || !["publish", "bin", "install-shadow"].includes(mode)) {
      usage();
      return 1;
    }
    const root = positional[2] ? path.resolve(positional[2]) : process.cwd();
    logger.info(`allmight: doctor ${mode} ${root}`);
    const report = await analyzePublishDoctor(root);
    await writeDoctorArtifacts(report, outputDir, mode);
    logger.info(`allmight: doctor risk=${report.publishRisk}`);
    logger.info(`allmight: artifacts -> ${outputDir}`);
    return 0;
  }

  const VALID_COMMANDS = new Set(["scan", "report", "propose", "fix-safe", "canonicalize"]);
  if (!VALID_COMMANDS.has(command)) {
    usage();
    return 1;
  }

  const root = positional[1] ? path.resolve(positional[1]) : process.cwd();

  logger.info(`allmight: scanning ${root}`);
  let report = await writeArtifactsFor(root, outputDir);

  if (command === "fix-safe") {
    const applied = await applySafePatches(report);
    report = await writeArtifactsFor(root, outputDir);
    logger.success(`allmight: applied ${applied.length} safe patches`);
  }

  if (command === "canonicalize") {
    console.log(JSON.stringify(report.canonicalMap, null, 2));
  } else {
    logger.info(`allmight: families=${report.stats.familiesDetected} patches=${report.stats.patchesProposed} safe=${report.stats.safePatches}`);
    logger.info(`allmight: artifacts -> ${outputDir}`);
  }

  return 0;
}
