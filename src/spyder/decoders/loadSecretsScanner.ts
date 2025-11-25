import type { SecretScanner } from './types.js';
import { localSecretScanner } from './secrets-local.js';

export async function loadSecretScanner(): Promise<SecretScanner> {
  try {
    const external: any = await import('@funeste38/spyder/decoders/secrets');
    if (external && typeof external.scanFileForSecrets === 'function') {
      const scanner: SecretScanner = {
        // normalize possible sync or async implementations and accept options
        scanFileForSecrets: async (filePath: string, options?: any) => {
          try {
            const res = external.scanFileForSecrets(filePath, options);
            return Array.isArray(res) ? (res as any[]) : await Promise.resolve(res);
          } catch (e) {
            return [];
          }
        },
      };
      return scanner;
    }
  } catch {
    // optional
  }
  return localSecretScanner;
}
