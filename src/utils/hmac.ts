import { createHmac, createHash } from 'crypto';

// Computes base64-encoded SHA256 of UTF-8 content (x-ms-content-sha256 style)
export function computeContentHash(content: string): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(content || '', 'utf8'));
  return hash.digest('base64');
}

// Compute HMAC-SHA256 signature from a base64-encoded secret key
export function computeHmacSignature(stringToSign: string, base64Secret: string): string {
  // secret is expected base64-encoded (like Azure resource key)
  const key = Buffer.from(base64Secret, 'base64');
  const h = createHmac('sha256', key);
  h.update(Buffer.from(stringToSign, 'utf8'));
  return h.digest('base64');
}

// Build authorization header and required signed headers for Azure-style HMAC-SHA256
export function buildHmacHeaders(opts: {
  method: string;
  pathWithQuery: string; // e.g. /identities?api-version=2021-03-07
  host: string; // requestUri.authority
  body?: string; // serialized JSON body
  date?: string; // RFC1123 date string; if not provided, created here
  secretBase64: string; // base64 resource key
}) {
  const date = opts.date || new Date().toUTCString();
  const content = opts.body || '';
  const contentHash = computeContentHash(content);
  // string to sign format: "VERB\n{pathWithQuery}\n{date};{host};{contentHash}"
  const stringToSign = `${opts.method.toUpperCase()}\n${opts.pathWithQuery}\n${date};${opts.host};${contentHash}`;
  const signature = computeHmacSignature(stringToSign, opts.secretBase64);
  const authorization = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;
  return {
    'Authorization': authorization,
    'x-ms-date': date,
    'x-ms-content-sha256': contentHash,
    // host header is normally set by HTTP client, include for completeness
    'host': opts.host,
  } as Record<string,string>;
}

// Example usage (not executed here):
// const headers = buildHmacHeaders({
//   method: 'POST',
//   pathWithQuery: '/identities?api-version=2021-03-07',
//   host: 'myendpoint.communication.azure.com',
//   body: JSON.stringify({ createTokenWithScopes: ['chat'] }),
//   secretBase64: process.env.AZURE_RESOURCE_ACCESS_KEY_BASE64!
// });
// fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body });
