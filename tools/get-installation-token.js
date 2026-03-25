#!/usr/bin/env node
// tools/get-installation-token.js
// Usage: set env vars GITHUB_APP_ID, GITHUB_INSTALLATION_ID, and either GITHUB_PRIVATE_KEY (PEM) or GITHUB_PRIVATE_KEY_FILE (path) then run:
//   node tools/get-installation-token.js
// Requires: npm install @octokit/auth-app

const fs = require('fs');

async function loadCreateAppAuth() {
  try {
    const mod = await import('@octokit/auth-app');
    return mod.createAppAuth || mod.default && mod.default.createAppAuth;
  } catch (e) {
    // rethrow to be handled by caller
    throw e;
  }
}

const appId = process.env.GITHUB_APP_ID;
const installationId = process.env.GITHUB_INSTALLATION_ID;
let privateKey = process.env.GITHUB_PRIVATE_KEY; // PEM contents, keep newlines

// Fallback: read from file if provided
if (!privateKey && process.env.GITHUB_PRIVATE_KEY_FILE) {
  try {
    privateKey = fs.readFileSync(process.env.GITHUB_PRIVATE_KEY_FILE, 'utf8');
  } catch (e) {
    console.error('Failed to read private key file:', e && e.message ? e.message : String(e));
    process.exit(1);
  }
}

if (!appId || !installationId || !privateKey) {
  console.error('Missing required env vars. Please set GITHUB_APP_ID, GITHUB_INSTALLATION_ID, and GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_FILE');
  process.exit(1);
}

function normalizePrivateKey(key) {
  if (!key) return key;
  // If the key was provided as a single line with literal \n sequences, convert them
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  // Trim surrounding quotes if accidentally included
  key = key.trim();
  if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
    key = key.slice(1, -1);
  }
  // If the key looks base64 (no BEGIN marker), attempt base64 decode and check
  if (!/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(key)) {
    // Heuristic: mostly base64 characters and reasonably long
    const b64 = key.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(b64) && b64.length > 100) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        if (/-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(decoded)) {
          key = decoded;
        }
      } catch (e) {
        // ignore decode errors
      }
    }
  }
  return key;
}

privateKey = normalizePrivateKey(privateKey);

async function main() {
  try {
    const createAppAuth = await loadCreateAppAuth();
    if (!createAppAuth) throw new Error('@octokit/auth-app did not export createAppAuth');

    const auth = createAppAuth({
      appId: Number(appId),
      privateKey,
      installationId: Number(installationId),
    });

    const installation = await auth({ type: 'installation' });
    console.log(installation.token);
  } catch (err) {
    console.error('Failed to obtain installation token:', err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

main();
