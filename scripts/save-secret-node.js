#!/usr/bin/env node
// Small helper to persist secrets encrypted to %USERPROFILE%/.qflush/secrets.json on Windows
// Uses Windows DPAPI via PowerShell ConvertFrom-SecureString. For cross-platform, store plain .env.local (user responsibility).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function saveSecret(key, value) {
  const dir = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.qflush');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'secrets.json');
  // use PowerShell to ConvertFrom-SecureString
  try {
    const cmd = `powershell -NoProfile -Command "$s=(ConvertTo-SecureString '${value.replace(/'/g, "''")}' -AsPlainText -Force); $s | ConvertFrom-SecureString"`;
    const enc = execSync(cmd, { encoding: 'utf8' }).trim();
    let obj = {};
    if (fs.existsSync(file)) obj = JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    obj[key] = enc;
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    console.log(`Saved ${key} to ${file}`);
  } catch (e) {
    console.error('Failed to save secret via PowerShell DPAPI, falling back to .env.local');
    fs.appendFileSync('.env.local', `${key}=${value}\n`, 'utf8');
  }
}

if (process.argv.length < 4) {
  console.error('Usage: node scripts/save-secret-node.js KEY VALUE');
  process.exit(2);
}
saveSecret(process.argv[2], process.argv[3]);
