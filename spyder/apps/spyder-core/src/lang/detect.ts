let franc: any;
try {
  franc = require('franc');
} catch (e) {
  // dynamic require fallback
  franc = undefined;
}

export function detectLanguage(text: string): string {
  try {
    if (!text || typeof text !== 'string') return 'unknown';
    const s = text.normalize ? text.normalize('NFC').trim() : String(text).trim();
    if (!s || s.length < 1) return 'unknown';

    // quick regex-based shortcuts for scripts
    // detect Cyrillic -> ru
    if (/[\u0400-\u04FF]/.test(s)) return 'ru';
    // detect CJK -> zh
    if (/[\u4E00-\u9FFF]/.test(s)) return 'zh';

    if (!franc) return 'unknown';
    try {
      const code = franc(s, { minLength: 3 });
      if (!code || code === 'und') return 'unknown';
      // franc returns ISO639-3, map to ISO 639-1 where possible
      const map: any = { eng: 'en', fra: 'fr', spa: 'es', cmn: 'zh', rus: 'ru', deu: 'de', jpn: 'ja', ara: 'ar', por: 'pt', ita: 'it' };
      return map[code] || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  } catch (e) {
    return 'unknown';
  }
}
