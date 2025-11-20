const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const tokenUrl = process.env.TOKEN_URL;
    const clientId = process.env.APP_ID;
    const clientSecret = process.env.APP_SECRET;
    if (!tokenUrl || !clientId || !clientSecret) return { statusCode: 500, body: JSON.stringify({ ok:false, error:'missing config' }) };

    // perform client_credentials exchange
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      body: params.toString()
    });
    const json = await res.json();
    // optionally store token in Netlify env (not possible from function), so return it to caller
    return { statusCode: 200, body: JSON.stringify({ ok:true, token: json }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:String(err) }) };
  }
};
