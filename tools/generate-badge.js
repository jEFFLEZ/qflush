#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const reportPath = path.join(process.cwd(), '.qflush', 'rome-lint-report.json');
let status = 'unknown';
if (fs.existsSync(reportPath)) {
  const r = JSON.parse(fs.readFileSync(reportPath,'utf8'));
  status = r.summary && r.summary.errors === 0 ? 'passing' : 'failing';
}
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" fill="#555"/><rect x="60" width="60" height="20" fill="${status==='passing'? '#4c1' : '#e05d44'}"/><text x="30" y="14" fill="#fff" font-family="Verdana" font-size="11">rome-lint</text><text x="90" y="14" fill="#fff" font-family="Verdana" font-size="11">${status}</text></svg>`;
fs.writeFileSync(path.join(process.cwd(),'rome-badge.svg'), svg, 'utf8');
console.log('Badge written rome-badge.svg ->', status);
