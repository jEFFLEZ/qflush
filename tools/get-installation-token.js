#!/usr/bin/env node
// tools/get-installation-token.js
// Usage: set env vars GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_PRIVATE_KEY (PEM) then run:
//   node tools/get-installation-token.js
// Requires: npm install @octokit/auth-app

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
const privateKey = process.env.GITHUB_PRIVATE_KEY; // PEM contents, keep newlines

if (!appId || !installationId || !privateKey) {
  console.error('Missing required env vars. Please set GITHUB_APP_ID, GITHUB_INSTALLATION_ID, and GITHUB_PRIVATE_KEY');
  process.exit(1);
}

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
