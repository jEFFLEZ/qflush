import path from 'path';
import { loadSecretScanner } from '../spyder/decoders/loadSecretsScanner.js';
import type { SecretFinding } from '../spyder/decoders/types.js';

export async function spyderSecretsCommand(dumpPath?: string): Promise<number> {
  const file = dumpPath ?? path.join(process.cwd(), 'parts', 'qflush-code-dump.txt');
  try {
    const scanner = await loadSecretScanner();
    const findings: SecretFinding[] = await scanner.scanFileForSecrets(file);

    if (!findings || findings.length === 0) {
      console.log('[SPYDER] Aucun secret détecté ✅');
      return 0;
    }

    console.log(`[SPYDER] ${findings.length} secrets potentiels trouvés :`);
    for (const f of findings) {
      console.log(`- ${f.rule} @ ${f.file}:${f.line} (${f.severity}) -> ${f.match}`);
    }
    return 2;
  } catch (err: any) {
    console.error('[SPYDER] Erreur lors du scan:', err && err.message ? err.message : String(err));
    return 1;
  }
}

// allow running directly
if (require && require.main === module) {
  const arg = process.argv[2];
  spyderSecretsCommand(arg).then(code => process.exit(code));
}