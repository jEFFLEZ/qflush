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

export function importUtil(name: string): any {
  // prefer spyder local workspace copy when present
  try {
    const paths = resolvePaths();
    const spy = paths['spyder'];
    if (spy) {
      // common locations inside spyder package layout
      const candidates = [
        path.join(spy, 'apps', 'spyder-core', 'src', 'utils', `${name}.js`),
        path.join(spy, 'apps', 'spyder-core', 'src', 'utils', `${name}.ts`),
        path.join(spy, 'src', 'utils', `${name}.js`),
        path.join(spy, 'src', 'utils', `${name}.ts`),
        path.join(spy, 'utils', `${name}.js`),
        path.join(spy, 'utils', `${name}.ts`),
      ];
      for (const c of candidates) {
        const m = tryRequire(c);
        if (m) return (m && m.default) || m;
      }
      // try requiring from spyder root via Node resolution
      try {
        const resolved = require.resolve(name, { paths: [spy] });
        const m = require(resolved);
        if (m) return (m && m.default) || m;
      } catch (e) {}
    }
  } catch (e) {
    // ignore
  }

  // fallback to local utils folder next to this file
  try {
    const local = tryRequire(path.join(__dirname, name));
    if (local) return (local && local.default) || local;
  } catch (e) {}

  // last resort: require by name (could be from node_modules)
  try {
    const m = require(name);
    return (m && m.default) || m;
  } catch (e) {}

  return undefined;
}

export default { importUtil };
