// ROME-TAG: 0x0E71A8

import colors from './colors';

export const logger = {
  info: (msg: string) => console.log(`\x1b[36m[QFLUSH]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[QFLUSH]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[QFLUSH]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[QFLUSH]\x1b[0m ${msg}`),
  joker: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'joker' }),
  nez: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'base' }),
  neutral: (title: string, msg: string) => colors.styledLog(title, msg, { accent: 'neutral' }),
};

export default logger;
