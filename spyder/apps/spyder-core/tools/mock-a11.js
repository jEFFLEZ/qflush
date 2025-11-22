const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const userMsg = j?.messages?.[0]?.content || 'hello';
        const reply = `A-11 mock reply to: ${userMsg}`;
        const out = { choices: [{ message: { content: reply } }] };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock A-11 listening on http://127.0.0.1:${PORT}`);
});
