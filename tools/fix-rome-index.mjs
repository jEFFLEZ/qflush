// Script ESM pour corriger les tags Rome et garantir l'export correct dans les fichiers d'index
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const files = [
  join(process.cwd(), 'src/services.js'),
  join(process.cwd(), 'src/services/index.js'),
];

for (const file of files) {
  if (!existsSync(file)) continue;
  let content = readFileSync(file, 'utf8');
  // Replace Rome tag at the top, keep export intact
  content = content.replace(/(\/\/ ROME-TAG: .*[\r\n]+)?(export \* from .*)/, (match, tag, exportLine) => {
    return (tag ? tag : '') + exportLine;
  });
  writeFileSync(file, content, 'utf8');
  console.log('Rome index fixed for', file);
}
