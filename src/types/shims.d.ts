// ROME-TAG: 0xDBADFC

declare module "@funeste38/nezlephant";
declare module "@funeste38/freeland";
declare module "@funeste38/bat";
declare module "@funeste38/envaptex";

// CommonJS/require style shims for specific modules used by tests
declare module '../utils/fetch' {
  const fetch: any;
  export = fetch;
}

declare module '../utils/fetch.js' {
  const fetch: any;
  export = fetch;
}

declare module '../daemon/qflushd' {
  const qflushd: any;
  export = qflushd;
}

declare module '../daemon/qflushd.js' {
  const qflushd: any;
  export = qflushd;
}

// Optional spyder decoder shim to avoid TS errors when package not installed
declare module "@funeste38/spyder/decoders/secrets" {
  export type SecretMatch = any;
  export function scanFileForSecrets(path: string): Promise<SecretMatch[]> | SecretMatch[];
}

// Local fallback module (when @funeste38/spyder not installed), provide same API
declare module 'src/spyder/decoders/secrets' {
  export type SecretMatch = any;
  export function scanFileForSecrets(path: string): Promise<SecretMatch[]> | SecretMatch[];
}
