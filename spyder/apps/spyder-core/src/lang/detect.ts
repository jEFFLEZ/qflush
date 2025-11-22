let franc: any;
try {
  franc = require('franc');
} catch (e) {
  // dynamic require fallback
  franc = undefined;
}

export function detectLanguage(text: string): string {
  if (!franc) return 'unknown';
  try {
    const code = franc(text, { minLength: 3 });
    if (!code || code === 'und') return 'unknown';
    // franc returns ISO639-3, we map common ones
    const map: any = { eng: 'en', fra: 'fr', spa: 'es', cmn: 'zh', rus: 'ru', deu: 'de', jpn: 'ja', ara: 'ar', por: 'pt', ita: 'it' };
    return map[code] || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}
