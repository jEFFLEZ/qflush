// ROME-TAG: 0x1609C0

import { existsSync } from "fs";
import { join } from "path";

// Map service names to npm package names and local folder candidates
export const SERVICE_MAP: Record<string, { pkg: string; candidates: string[] }> = {
  rome: { pkg: "@funeste38/rome", candidates: ["./rome", "./Rome"] },
  nezlephant: { pkg: "@funeste38/nezlephant", candidates: ["./nezlephant", "./Nezlephant"] },
  envaptex: { pkg: "@funeste38/envaptex", candidates: ["./envaptex", "./Envaptex"] },
  freeland: { pkg: "@funeste38/freeland", candidates: ["./freeland", "./Freeland"] },
  bat: { pkg: "@funeste38/bat", candidates: ["./bat", "./BAT"] },
  // placeholders for future projects
  // Prefer the apps/spyder-core subpackage so the runtime runs the actual app entrypoint
  spyder: { pkg: "@funeste38/spyder", candidates: ["./spyder/apps/spyder-core", "./spyder/spyder", "./spyder"] },
};

export function resolvePaths(detected: any = {}) {
  const out: Record<string, string | undefined> = {};
  for (const key of Object.keys(SERVICE_MAP)) {
    // Prefer local candidate folders when present in the workspace
    const tries = SERVICE_MAP[key].candidates;
    let found: string | undefined;
    for (const t of tries) {
      const p = join(process.cwd(), t);
      if (existsSync(p)) {
        found = p;
        break;
      }
    }
    if (found) {
      out[key] = found;
      continue;
    }

    // Fallback to detected package path (e.g., node_modules resolution)
    if (detected && detected[key] && detected[key].path) {
      out[key] = detected[key].path;
      continue;
    }
  }
  return out;
}
