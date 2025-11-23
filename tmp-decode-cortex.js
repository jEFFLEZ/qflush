// Temporary helper to decode a cortex PNG using compiled dist codec
(async () => {
  try {
    const codec = require('./dist/cortex/pngCodec');
    const path = process.argv[2] || 'parts/ideas_oc8.png';
    const pkt = await codec.decodeCortexPacketFromPng(path);
    console.log(JSON.stringify({ ok: true, packet: pkt }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e), stack: e && e.stack ? e.stack : null }, null, 2));
    process.exit(1);
  }
})();