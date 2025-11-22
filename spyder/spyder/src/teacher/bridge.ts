import http from 'http';

function concatUint8(arr: Uint8Array[]) {
  let total = 0;
  for (const a of arr) total += a.length;
  const out = new Uint8Array(total);
  let offs = 0;
  for (const a of arr) {
    out.set(a, offs);
    offs += a.length;
  }
  return out;
}

function uint8ToBase64(u8: Uint8Array): string {
  const G = (globalThis as any);
  if (G && G.Buffer) return G.Buffer.from(u8).toString('base64');
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  if (typeof btoa !== 'undefined') return btoa(binary);
  throw new Error('No base64 encoder available');
}

function base64ToUint8(b64: string): Uint8Array {
  const G = (globalThis as any);
  if (G && G.Buffer) return Uint8Array.from(G.Buffer.from(b64, 'base64'));
  if (typeof atob !== 'undefined') {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  throw new Error('No base64 decoder available');
}

export async function sendToA11(payload: Uint8Array): Promise<Uint8Array> {
  const bodyObj = { data: uint8ToBase64(payload) };
  const data = JSON.stringify(bodyObj);
  const enc = new TextEncoder();
  const dataLen = enc.encode(data).length;

  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/ask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(dataLen),
    },
    timeout: 5000,
  } as const;

  return new Promise((resolve) => {
    const req = http.request(options, (res: any) => {
      const chunks: Uint8Array[] = [];
      res.on('data', (c: any) => {
        try {
          chunks.push(Uint8Array.from(c));
        } catch (e) {
          // ignore
        }
      });
      res.on('end', () => {
        try {
          const all = concatUint8(chunks);
          const text = new TextDecoder('utf-8').decode(all);
          const json = JSON.parse(text);
          if (json && json.data) {
            resolve(base64ToUint8(json.data));
            return;
          }
        } catch (e) {
          // fallthrough
        }
        resolve(new Uint8Array());
      });
    });

    req.on('error', () => resolve(new Uint8Array()));
    req.on('timeout', () => { req.destroy(); resolve(new Uint8Array()); });
    req.write(data);
    req.end();
  });
}
