import path from 'path';
import { registerDecoder } from '../protocol/decoder';
import config from '../config/default.json';

export async function loadLanguageDecoders() {
  const langs: string[] = (config as any).languages || [];
  for (const l of langs) {
    try {
      // resolve candidate module paths and try requiring them (works with ts-node)
      const base = path.join(__dirname, 'decoders', l);
      let mod: any = null;

      const tryRequire = (p: string) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          return require(p);
        } catch (e) {
          return null;
        }
      };

      mod = tryRequire(base) || tryRequire(base + '.js') || tryRequire(base + '.ts');

      // as a last resort try dynamic import (for ESM-built runtime)
      if (!mod) {
        try {
          // use file:// URL for import when a full path is provided
          const url = require('url').pathToFileURL(base + '.js').href;
          mod = await import(url);
        } catch (e) {
          // ignore
        }
      }

      if (mod && (mod.default || mod)) {
        const fn = mod.default || mod;
        registerDecoder(l, fn);
        console.log('Loaded language decoder', l);
      } else {
        throw new Error('decoder module not found');
      }
    } catch (e) {
      console.warn('Failed to load language decoder', l, e && e.message ? e.message : e);
    }
  }
}
