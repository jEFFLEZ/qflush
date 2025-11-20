// Polyfill minimal File/Blob for Node environments when libraries expect browser globals
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Uint8Array {
    constructor(parts = [], name = 'file', options = {}) {
      // naive implementation: store data as concatenated string/Uint8Array
      const chunks = parts.map(p => typeof p === 'string' ? Buffer.from(p) : Buffer.from(p));
      const buf = Buffer.concat(chunks);
      super(buf);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.size = buf.length;
      this.type = options.type || '';
    }
    text() { return Promise.resolve(Buffer.from(this).toString('utf8')); }
    arrayBuffer() { return Promise.resolve(Uint8Array.from(this).buffer); }
    stream() { throw new Error('stream() not implemented'); }
  };
}
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob extends Uint8Array {
    constructor(parts = [], options = {}) {
      const chunks = parts.map(p => typeof p === 'string' ? Buffer.from(p) : Buffer.from(p));
      const buf = Buffer.concat(chunks);
      super(buf);
      this.size = buf.length;
      this.type = options.type || '';
    }
    text() { return Promise.resolve(Buffer.from(this).toString('utf8')); }
    arrayBuffer() { return Promise.resolve(Uint8Array.from(this).buffer); }
  };
}
