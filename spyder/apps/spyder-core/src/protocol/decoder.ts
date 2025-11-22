import { detectLanguage } from '../lang/detect';

type DecoderFn = (input: Uint8Array) => Promise<any>;

const registry = new Map<string, DecoderFn>();

export function registerDecoder(prefix: string, fn: DecoderFn) {
  registry.set(prefix, fn);
}

export function listDecoders() {
  return Array.from(registry.keys());
}

// Décodeur texte brut par défaut
async function defaultDecoder(input: Uint8Array): Promise<string> {
  return new TextDecoder().decode(input);
}

export async function decodePayload(input: Uint8Array): Promise<any> {
  const text = new TextDecoder().decode(input);

  const idx = text.indexOf(':');
  if (idx > 0) {
    const prefix = text.slice(0, idx);
    const rest = text.slice(idx + 1);

    const fn = registry.get(prefix);
    if (fn) {
      try {
        console.debug('[decoder] using prefix decoder', prefix);
        return await fn(new TextEncoder().encode(rest));
      } catch (e) {
        console.warn('[decoder] prefix decoder error', prefix, e);
        return null;
      }
    } else {
      console.warn('[decoder] no decoder registered for prefix', prefix);
    }
  }

  // no prefix -> detect language and dispatch
  const lang = detectLanguage(text);
  console.debug('[decoder] detected language', lang, 'from text:', text.slice(0, 64));
  const fn = registry.get(lang);
  if (fn) {
    try {
      return await fn(input);
    } catch (e) {
      console.warn('[decoder] language decoder error', lang, e);
      return null;
    }
  } else {
    console.warn('[decoder] no decoder registered for detected language', lang);
  }

  return defaultDecoder(input);
}

// Exemple d'enregistrement
// registerDecoder('nez', async (bytes) => { ... });
