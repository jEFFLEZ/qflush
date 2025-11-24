const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

const config = {
  ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  port: process.env.PORT || 3000
};

app.get('/v1/health', (req, res) => res.json({ ok: true }));

app.post('/v1/chat', async (req, res) => {
  try {
    const payload = req.body || {};
    // proxy to Ollama's simple API (/api/chat) — adapt if your local Ollama API differs
    const ollamaResp = await fetch(config.ollamaUrl + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const text = await ollamaResp.text();
    // Try to return JSON if possible, otherwise wrap
    try { const j = JSON.parse(text); return res.json(j); } catch (e) { return res.json({ id: 'a11-fallback', model: payload.model || 'unknown', choices: [{ message: { role: 'assistant', content: text } }] }); }
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.listen(config.port, () => console.log('A-11 server listening on port', config.port));
