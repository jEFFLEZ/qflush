const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    // optional: verify signature if you have one
    // forward to the local daemon if DAEMON_URL is set, otherwise process here
    const daemonUrl = process.env.DAEMON_URL || '';
    if (daemonUrl) {
      const url = `${daemonUrl.replace(/\/$/, '')}/qflush/license/webhook`;
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { statusCode: 200, body: JSON.stringify({ ok: true, forwarded: url }) };
    }
    // example local processing: check refund
    const purchase = body.purchase || body.data || null;
    let action = 'noop';
    if (purchase) {
      if (purchase.refunded || purchase.chargebacked) action = 'clear_license';
      if (purchase.subscription_cancelled_at) action = 'cancel_subscription';
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, action }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
