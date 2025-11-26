// Script pour corriger les tags Rome et garantir l'export correct dans les fichiers d'index
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../src/services.js'),
  path.join(__dirname, '../src/services/index.js'),
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  // Replace Rome tag at the top, keep export intact
  content = content.replace(/(\/\/ ROME-TAG: .*[\r\n]+)?(export \* from .*)/, (match, tag, exportLine) => {
    return (tag ? tag : '') + exportLine;
  });
  fs.writeFileSync(file, content, 'utf8');
  console.log('Rome index fixed for', file);
}
