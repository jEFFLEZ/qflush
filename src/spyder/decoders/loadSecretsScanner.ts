import type { SecretScanner } from './types.js';
import { localSecretScanner } from './secrets-local.js';

export async function loadSecretScanner(): Promise<SecretScanner> {
  try {
    // attempt to require the external package if available without static import
    // eslint-disable-next-line no-eval
    const maybe = eval("typeof require !== 'undefined' ? require('@funeste38/spyder/decoders/secrets') : undefined");
    if (maybe && typeof maybe.scanFileForSecrets === 'function') {
      return {
        scanFileForSecrets: (filePath: string, options?: any) =>
          Promise.resolve(maybe.scanFileForSecrets(filePath, options)),
      } as SecretScanner;
    }
  } catch (e) {
    // ignore and fall back to local scanner
  }

  return localSecretScanner;
}
