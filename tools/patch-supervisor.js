const fs = require('fs');
const p = 'src/supervisor/index.ts';
let s = fs.readFileSync(p,'utf8');
if (s.includes("import { logger } from '../utils/logger';")) {
  s = s.replace("import { logger } from '../utils/logger';", "import alias from '../utils/alias';\nconst logger = alias.importUtil('@utils/logger') || alias.importUtil('../utils/logger') || console;");
  fs.writeFileSync(p,s,'utf8');
  console.log('patched supervisor');
} else {
  console.log('no pattern found');
}
