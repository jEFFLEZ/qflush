// Script ESM pour copier automatiquement le proxy services.js et index.js dans dist après build
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const srcProxy = join(process.cwd(), 'src/services.js');
const distProxy = join(process.cwd(), 'dist/services.js');
const srcIndex = join(process.cwd(), 'src/services/index.js');
const distDir = join(process.cwd(), 'dist/services');
const distIndex = join(distDir, 'index.js');

if (existsSync(srcProxy)) {
  copyFileSync(srcProxy, distProxy);
  console.log('Copied services.js proxy to dist.');
}
if (existsSync(srcIndex)) {
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  copyFileSync(srcIndex, distIndex);
  console.log('Copied services/index.js to dist.');
}
