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
  return new TextDecoder('utf-8').decode(input);
}

export async function decodePayload(input: Uint8Array): Promise<any> {
  // decode as UTF-8 and normalize
  let text = new TextDecoder('utf-8').decode(input || new Uint8Array());
  try {
    text = (text || '').normalize('NFC').trim();
  } catch (e) {
    text = (text || '').trim();
  }

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
  // require a minimum length for reliable detection
  const MIN_DETECT_LENGTH = 8;
  const sample = text.slice(0, 1024);
  if (!sample || sample.length < MIN_DETECT_LENGTH) {
    console.debug('[decoder] input too short for language detection, using default decoder');
    return defaultDecoder(input);
  }

  const lang = detectLanguage(sample);
  console.debug('[decoder] detected language', lang, 'from text:', sample.slice(0, 64));
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
