#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), '..');
const DIST_TAG = path.join(ROOT, 'dist', 'rome', 'rome-tag.js');
let rome = null;
(async () => {
  try {
    try {
      // try require-style via dynamic import of file URL
      const distTagUrl = pathToFileURL(DIST_TAG).href;
      const mod = await import(distTagUrl);
      rome = mod.default || mod;
    } catch (e) {
      // fallback to local JS if not built
      try {
        const localPath = path.join(process.cwd(), 'src', 'rome', 'rome-tag.js');
        const localUrl = pathToFileURL(localPath).href;
        const mod2 = await import(localUrl);
        rome = mod2.default || mod2;
      } catch (e2) {
        console.error('rome-tag module not found; run npm run build');
        process.exit(2);
      }
    }

    const FIX = process.argv.includes('--fix');

    function inferTypeFromPath(relPath) {
      if (relPath.startsWith('src/daemon/')) return 'daemon';
      if (relPath.startsWith('src/commands/')) return 'command';
      if (relPath.startsWith('src/tests/')) return 'test';
      if (relPath.startsWith('src/utils/')) return 'util';
      if (relPath.includes('/lib/') || relPath.includes('/dist/')) return 'lib';
      return 'file';
    }

    function loadIndex() {
      try {
        const idxPath = path.join(process.cwd(), '.qflush', 'rome-index.json');
        if (fs.existsSync(idxPath)) return JSON.parse(fs.readFileSync(idxPath,'utf8')||'{}');
      } catch (e) {}
      return {};
    }

    function lintFile(absPath, index) {
      const rel = path.relative(process.cwd(), absPath).replace(/\\/g,'/');
      const relNorm = rel.replace(/^\.?\//,'');
      const typeFromIndex = index && index[relNorm] && index[relNorm].type;
      const type = typeFromIndex || inferTypeFromPath(relNorm);

      const content = fs.readFileSync(absPath,'utf8');
      const lines = content.split(/\r?\n/);

      let existingTag = null;
      let tagLineIndex = -1;
      for (let i=0;i<Math.min(5, lines.length); i++) {
        const parsed = rome.parseRomeTagComment(lines[i]);
        if (parsed != null) { existingTag = parsed; tagLineIndex = i; break; }
      }

      const computed = rome.computeRomeTag({ type, path: relNorm });
      const expectedComment = rome.buildRomeTagComment(computed);

      if (existingTag == null || existingTag !== computed) {
        if (FIX) {
          if (tagLineIndex === -1) {
            lines.unshift(expectedComment, '');
          } else {
            lines[tagLineIndex] = expectedComment;
          }
          fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
          console.log('[FIX] ' + relNorm + ' -> ' + expectedComment);
        } else {
          console.warn('[MISMATCH] ' + relNorm + ': expected ' + expectedComment + ' found ' + (existingTag ? rome.toRomeTagHex(existingTag) : 'none'));
        }
      } else {
        console.log('[OK] ' + relNorm + ' (' + rome.toRomeTagHex(computed) + ')');
      }
    }

    function walk(dir, index) {
      const items = fs.readdirSync(dir);
      for (const it of items) {
        if (it === 'node_modules' || it === '.git') continue;
        const full = path.join(dir,it);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full,index);
        else {
          const ext = path.extname(it).toLowerCase();
          if (!['.ts','.js','.tsx','.jsx','.json','.html'].includes(ext)) continue;
          lintFile(full,index);
        }
      }
    }

    const index = loadIndex();
    walk(path.join(process.cwd(),'src'), index);

    console.log('done');
  } catch (err) {
    console.error('rome-lint failed', err);
    process.exit(1);
  }
})();

function pathToFileURL(p) {
  // small helper to convert a path to file URL
  const resolved = path.resolve(p).split(path.sep).join('/');
  return 'file://' + (resolved.startsWith('/') ? '' : '/') + resolved;
}
