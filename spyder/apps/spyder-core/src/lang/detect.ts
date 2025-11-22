let franc: any;
try {
  franc = require('franc');
} catch (e) {
  franc = undefined;
}

export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) return 'unknown';

  // Quick explicit-range heuristics for common scripts
  try {
    // Cyrillic range
    if (/[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/.test(text)) return 'ru';
    // Arabic range
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return 'ar';
    // Han (CJK Unified Ideographs)
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    // Devanagari
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Hiragana/Katakana
    if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  } catch (e) {
    // ignore
  }

  if (!franc) return 'unknown';
  try {
    const code = franc(text, { minLength: 3 });
    if (!code || code === 'und') return 'unknown';
    const map: any = { eng: 'en', fra: 'fr', spa: 'es', cmn: 'zh', rus: 'ru', deu: 'de', jpn: 'ja', ara: 'ar', por: 'pt', ita: 'it', hin: 'hi' };
    return map[code] || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}
