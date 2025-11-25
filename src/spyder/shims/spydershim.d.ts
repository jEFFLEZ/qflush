declare module '@funeste38/spyder/decoders/secrets' {
  import type { SecretFinding } from '../types';
  export function scanFileForSecrets(path: string): Promise<SecretFinding[]>;
}
