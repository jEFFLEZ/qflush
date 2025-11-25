import colors from './colors';

const isProd = process.env.NODE_ENV === 'production';

const _logger = {
  info: (msg: string, ...rest: any[]) => console.log(`\x1b[36m[QFLUSH]\x1b[0m ${msg}`, ...rest),
  warn: (msg: string, ...rest: any[]) => console.log(`\x1b[33m[QFLUSH]\x1b[0m ${msg}`, ...rest),
  error: (msg: string, ...rest: any[]) => console.error(`\x1b[31m[QFLUSH]\x1b[0m ${msg}`, ...rest),
  success: (msg: string, ...rest: any[]) => console.log(`\x1b[32m[QFLUSH]\x1b[0m ${msg}`, ...rest),
  joker: (title: string, msg: string) => (colors && (colors as any).styledLog ? (colors as any).styledLog(title, msg, { accent: 'joker' }) : console.log(title, msg)),
  nez: (title: string, msg: string) => (colors && (colors as any).styledLog ? (colors as any).styledLog(title, msg, { accent: 'base' }) : console.log(title, msg)),
  neutral: (title: string, msg: string) => (colors && (colors as any).styledLog ? (colors as any).styledLog(title, msg, { accent: 'neutral' }) : console.log(title, msg)),
  debug: (...args: any[]) => { if (!isProd) (console.debug || console.log)(...args); },
};

export const logger = _logger;
export default _logger;
export const info = _logger.info;
export const warn = _logger.warn;
export const error = _logger.error;
export const debug = _logger.debug;
export const success = _logger.success;
