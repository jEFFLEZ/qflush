import fs from 'fs';
import path from 'path';

export async function applyRulesToProject(rules: any) {
  // Move legacy files to src/legacy
  if (rules.refactor && rules.refactor.move_legacy) {
    const legacyDir = path.join(process.cwd(), 'src', 'legacy');
    if (!fs.existsSync(legacyDir)) fs.mkdirSync(legacyDir, { recursive: true });
    // naive: move files from src/daemon & old folders
    const candidates = ['src/daemon', 'src/rome'];
    for (const c of candidates) {
      const p = path.join(process.cwd(), c);
      if (fs.existsSync(p)) {
        const target = path.join(legacyDir, path.basename(c));
        try {
          fs.renameSync(p, target);
        } catch (e) {
          // best effort
        }
      }
    }
  }

  // Rebuild imports - naive placeholder: scan ts files and fix relative imports (not implemented)
  if (rules.refactor && rules.refactor.rebuild_imports) {
    // TODO: implement AST-based import fix
  }

  // Ensure log prefixes
  if (rules.rules && rules.rules.logs_uniform) {
    // find .ts files and ensure a logger prefix constant exists (placeholder)
  }
}
