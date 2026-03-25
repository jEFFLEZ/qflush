const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

const config = {
  qflushUrl:  process.env.QFLUSH_URL   || '',
  ollamaUrl:  process.env.OLLAMA_URL   || 'http://127.0.0.1:11434',
  openaiKey:  process.env.OPENAI_API_KEY || '',
  openaiUrl:  process.env.OPENAI_BASE_URL || 'https://api.openai.com',
  port:       process.env.PORT          || 3000
};

/**
 * Detect which backend should handle the request.
 * Returns { backend: 'openai'|'local'|'ollama', baseUrl: string }
 */
function selectBackend(model = '', explicitProvider = '') {
  const p = explicitProvider.toLowerCase();
  const m = model.toLowerCase();

  // Explicit provider header / field wins
  if (p === 'openai' || m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')) {
    return { backend: 'openai', baseUrl: config.openaiUrl };
  }

  // Local / Qflush
  if (p === 'local' || p === 'qflush') {
    if (!config.qflushUrl) throw new Error('QFLUSH_URL not set — cannot route to local backend');
    return { backend: 'local', baseUrl: config.qflushUrl };
  }

  // Auto: if QFLUSH_URL is set and model looks like a local model → Qflush
  if (config.qflushUrl && (m.startsWith('llama') || m.startsWith('mistral') || m.startsWith('qflush') || m.startsWith('phi') || m.startsWith('gemma'))) {
    return { backend: 'local', baseUrl: config.qflushUrl };
  }

  // If QFLUSH_URL set and no other match → route to Qflush by default
  if (config.qflushUrl) {
    return { backend: 'local', baseUrl: config.qflushUrl };
  }

  // Pure local dev fallback → Ollama
  return { backend: 'ollama', baseUrl: config.ollamaUrl };
}

function normalizeBase(base) {
  return String(base || '').replace(/\/$/, '');
}

async function postJsonWithFallback(baseUrl, paths, payload) {
  const base = normalizeBase(baseUrl);
  const errors = [];
  for (const p of paths) {
    const url = base + p;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    if (resp.ok) {
      return { ok: true, status: resp.status, text, url };
    }
    errors.push({ status: resp.status, body: text, url });
    // Continue only for not found/forbidden to support multiple deployment path variants.
    if (resp.status !== 404 && resp.status !== 403) {
      return { ok: false, status: resp.status, text, url, errors };
    }
  }
  const last = errors[errors.length - 1] || { status: 502, body: 'upstream_unreachable', url: base };
  return { ok: false, status: last.status, text: last.body, url: last.url, errors };
}

function toOpenAIShape(payload, rawText) {
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && Array.isArray(parsed.choices)) return parsed;
    const content = parsed?.message?.content || parsed?.response || rawText;
    return {
      id: parsed?.id || 'a11-proxy',
      model: parsed?.model || payload.model || 'unknown',
      choices: [{ message: { role: 'assistant', content: String(content || '') } }]
    };
  } catch (_e) {
    return {
      id: 'a11-fallback',
      model: payload.model || 'unknown',
      choices: [{ message: { role: 'assistant', content: String(rawText || '') } }]
    };
  }
}

app.get('/v1/health', (req, res) => {
  res.json({
    ok: true,
    router: 'integrated',
    backends: {
      openai: { configured: !!config.openaiKey, url: config.openaiUrl },
      local:  { configured: !!config.qflushUrl, url: config.qflushUrl || null },
      ollama: { url: config.ollamaUrl }
    }
  });
});
app.get('/health', (req, res) => res.redirect(307, '/v1/health'));

async function handleChat(req, res) {
  try {
    const payload = req.body || {};
    const explicitProvider = req.headers['x-provider'] || payload.provider || '';
    const model = payload.model || '';

    let route;
    try {
      route = selectBackend(model, explicitProvider);
    } catch (e) {
      return res.status(400).json({ error: String(e) });
    }

    console.log(`[a11-router] ${model || '(no model)'} → backend=${route.backend} url=${route.baseUrl}`);

    // ── OpenAI ─────────────────────────────────────────────────────────────
    if (route.backend === 'openai') {
      if (!config.openaiKey) {
        return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
      }
      // Strip non-OpenAI fields before forwarding
      const { provider: _p, ...fwdPayload } = payload;
      const resp = await fetch(normalizeBase(route.baseUrl) + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiKey}`
        },
        body: JSON.stringify(fwdPayload)
      });
      const text = await resp.text();
      if (!resp.ok) {
        return res.status(resp.status).json({ error: 'openai_error', status: resp.status, body: text });
      }
      return res.json(toOpenAIShape(payload, text));
    }

    // ── Ollama (pure local dev) ────────────────────────────────────────────
    if (route.backend === 'ollama') {
      const resp = await fetch(normalizeBase(route.baseUrl) + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await resp.text();
      if (!resp.ok) {
        return res.status(resp.status).json({ error: 'ollama_error', status: resp.status, body: text });
      }
      return res.json(toOpenAIShape(payload, text));
    }

    // ── Qflush / local ────────────────────────────────────────────────────
    const result = await postJsonWithFallback(
      route.baseUrl,
      ['/api/chat/completions', '/v1/chat/completions', '/v1/chat'],
      payload
    );
    if (!result.ok) {
      return res.status(result.status).json({
        error: 'qflush_error',
        status: result.status,
        body: result.text,
        tried: (result.errors || []).map((e) => ({ url: e.url, status: e.status }))
      });
    }
    return res.json(toOpenAIShape(payload, result.text));

  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

app.post('/v1/chat', handleChat);
app.post('/v1/chat/completions', handleChat);

app.listen(config.port, () => {
  console.log('[a11-router] listening on port', config.port);
  console.log('[a11-router] backends:');
  console.log('  openai =', config.openaiKey ? config.openaiUrl : '(not configured)');
  console.log('  local  =', config.qflushUrl || '(not configured — Qflush disabled)');
  console.log('  ollama =', config.ollamaUrl, '(fallback)');
});
