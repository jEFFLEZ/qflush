const express = require('express');

let _server = null;
let _server4500 = null;
function startServer(port) {
  if (_server) return _server;
  const app = express();
  app.get('/npz/rome-index', (_req, res) => res.json({ success: true, count: 0, items: [] }));
  _server = app.listen(port, () => console.log(`placeholder qflushd listening on ${port}`));
  const alt = 4500;
  if (alt !== port && !_server4500) {
    _server4500 = app.listen(alt, () => console.log(`placeholder qflushd also listening on ${alt}`));
  }
  return _server;
}

function stopServer() {
  if (_server) {
    try { _server.close(); } catch (e) {}
    _server = null;
  }
  if (_server4500) {
    try { _server4500.close(); } catch (e) {}
    _server4500 = null;
  }
}

module.exports = { startServer, stopServer };

// if executed directly, start on env port
if (require.main === module) {
  const PORT = process.env.QFLUSHD_PORT ? Number(process.env.QFLUSHD_PORT) : 43421;
  startServer(PORT);
}
