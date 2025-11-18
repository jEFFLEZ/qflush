#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pkgPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found');
  process.exit(2);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const bin = pkg.bin && (typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0]);
if (!bin) {
  console.error('No bin entry in package.json');
  process.exit(2);
}
const binPath = path.join(__dirname, '..', bin);
if (!fs.existsSync(binPath)) {
  console.error(`CLI entry missing: ${binPath}`);
  console.error('Réparez en reconstruisant le paquet localement:');
  console.error('  cd qflash');
  console.error('  npm install');
  console.error('  npm run build');
  console.error('  npm install -g .');
  process.exit(2);
}
console.log('CLI check OK:', binPath);
process.exit(0);
