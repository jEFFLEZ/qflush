import path from 'path';
import { registerDecoder } from '../protocol/decoder';
import config from '../config/default.json';

export async function loadLanguageDecoders() {
  const langs: string[] = (config as any).languages || [];
  for (const l of langs) {
    try {
      const p = `./decoders/${l}`;
      const mod = await import(p);
      if (mod && mod.default) {
        registerDecoder(l, mod.default);
        console.log('Loaded language decoder', l);
      }
    } catch (e) {
      console.warn('Failed to load language decoder', l, e);
    }
  }
}
