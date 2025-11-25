#!/usr/bin/env node
// Lightweight scanner to find static imports of known ESM-only packages
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const CONFIG = path.join(__dirname, 'esm-scan-config.json');

async function loadTargets() {
  // default list of packages that are commonly ESM-only or moving to ESM
  const defaults = [
    'node-fetch',
    'openai',
    '@openai',
    'esbuild',
    'esbuild-wasm',
    '@vercel',
    '@netlify',
    '@azure',
    '@aws-sdk',
    'node:fs',
  ];
  try {
    if (fsSync.existsSync(CONFIG)) {
      const raw = await fs.readFile(CONFIG, 'utf8');
      const cfg = JSON.parse(raw || '[]');
      if (Array.isArray(cfg) && cfg.length) return cfg;
    }
  } catch (e) {
    // ignore and return defaults
  }
  return defaults;
}

async function walk(dir) {
  const out = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...await walk(full));
    else if (it.isFile() && full.endsWith('.ts')) out.push(full);
  }
  return out;
}

async function checkFile(file, targets) {
  const src = await fs.readFile(file, 'utf8');
  for (const t of targets) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re1 = new RegExp(`import\\s+.*\\s+from\\s+['\"]${esc}['\"]`);
    const re2 = new RegExp(`require\\(['\"]${esc}['\"]\\)`);
    if (re1.test(src) || re2.test(src)) {
      console.warn('[esm-scan] static import of', t, 'found in', file);
      console.warn('  -> consider replacing with dynamic import or using an alternative (undici/global fetch)');
    }
  }
}

(async function main(){
  if (!fsSync.existsSync(SRC)) {
    console.error('src directory not found');
    process.exit(1);
  }
  const targets = await loadTargets();
  console.log('Scanning for static imports of:', targets.join(', '));
  const files = await walk(SRC);
  for (const f of files) await checkFile(f, targets);
  console.log('done');
})();
