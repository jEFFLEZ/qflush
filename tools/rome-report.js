#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const reportPath = path.join(process.cwd(), '.qflush', 'rome-lint-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('report not found, run tools/rome-lint.js --report first');
  process.exit(2);
}
const report = JSON.parse(fs.readFileSync(reportPath,'utf8'));

let html = `<!doctype html><html><head><meta charset="utf-8"><title>Rome Lint Report</title><style>body{font-family:system-ui,Segoe UI,Roboto,Arial}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f4f4f4}</style></head><body>`;
html += `<h1>Rome Lint Report</h1>`;
html += `<p>Summary: files=${report.summary.files} warnings=${report.summary.warnings} errors=${report.summary.errors} todos=${report.summary.todos}</p>`;

html += `<h2>Forbidden Imports</h2><table><tr><th>file</th><th>import</th></tr>`;
for (const fi of report.forbiddenImports) html += `<tr><td>${fi.file}</td><td>${fi.import}</td></tr>`;
html += `</table>`;

html += `<h2>Tag mismatches</h2><table><tr><th>file</th><th>expected</th><th>found</th></tr>`;
for (const f of report.files.filter(x=>x.mismatchedTag)) html += `<tr><td>${f.path}</td><td>${f.expected||''}</td><td>${f.found||''}</td></tr>`;
html += `</table>`;

html += `<h2>Todos</h2><ul>`;
for (const t of report.todos) html += `<li>${t.file} @ ${t.index} -> ${t.match}</li>`;
html += `</ul>`;

html += `</body></html>`;
const out = path.join(process.cwd(), '.qflush', 'rome-report.html');
fs.writeFileSync(out, html, 'utf8');
console.log('Rome report generated at', out);
