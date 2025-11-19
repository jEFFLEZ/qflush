// ROME-TAG: 0xSPYDER

export default async function runSpyder(_argv?: string[]) {
  if (_argv && _argv.includes('--mem')) {
    console.log('spyder: mem stats not implemented yet');
  } else {
    console.log('spyder: coming soon — spyder hooks will be added in future releases');
  }
  return 0;
}
