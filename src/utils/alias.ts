import * as fs from 'fs';
import * as path from 'path';
import { resolvePaths } from './paths';

function tryRequire(filePath: string) {
  try {
    if (fs.existsSync(filePath)) return require(filePath);
  } catch (e) {
    try { return require(filePath); } catch (e) {}
  }
  return undefined;
}

function tryRequireVariants(basePath: string) {
  const variants = [".js", ".ts", "/index.js", "/index.ts"];
  for (const v of variants) {
    const p = basePath.endsWith(v) ? basePath : basePath + v;
    const m = tryRequire(p);
    if (m) return (m && m.default) || m;
  }
  return undefined;
}

export function importUtil(name: string): any {
  // normalize alias forms such as '@utils/foo' or '#utils/foo' to a simple local name
  let localName = name;
  const aliasMatch = name && (name.startsWith('@utils/') || name.startsWith('#utils/'));
  if (aliasMatch) localName = name.replace(/^(@|#)?utils\//, '');

  // prefer spyder local workspace copy when present
  try {
    const paths = resolvePaths();
    const spy = paths['spyder'];
    if (spy) {
      // common locations inside spyder package layout
      const candidates = [
        path.join(spy, 'apps', 'spyder-core', 'src', 'utils', localName),
        path.join(spy, 'apps', 'spyder-core', 'src', localName),
        path.join(spy, 'src', 'utils', localName),
        path.join(spy, 'src', localName),
        path.join(spy, 'utils', localName),
      ];
      for (const c of candidates) {
        const m = tryRequireVariants(c);
        if (m) return m;
      }
      // try requiring from spyder root via Node resolution (works if spyder is a package)
      try {
        const resolved = require.resolve(localName, { paths: [spy] });
        const m = require(resolved);
        if (m) return (m && m.default) || m;
      } catch (e) {}
    }
  } catch (e) {
    // ignore
  }

  // If name was an alias like @utils/foo, try local src/utils/<foo>
  if (aliasMatch) {
    try {
      const local = tryRequireVariants(path.join(__dirname, localName));
      if (local) return local;
    } catch (e) {}
  }

  // fallback: if a relative path or module name was passed, try requiring directly
  try {
    // try direct file/module
    const m1 = tryRequire(name);
    if (m1) return (m1 && m1.default) || m1;
  } catch (e) {}

  // last resort: require by name (could be from node_modules)
  try {
    const m = require(name);
    return (m && m.default) || m;
  } catch (e) {}

  return undefined;
}

export default { importUtil };
