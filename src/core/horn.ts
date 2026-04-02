import { spawn } from 'node:child_process';

type HornHandler = (payload?: any, options?: any) => any | Promise<any>;

const registry = new Map<string, HornHandler>();

export function registerHorn(name: string, handler: HornHandler) {
  if (typeof handler !== 'function') {
    throw new Error('[HORN] handler must be a function');
  }
  registry.set(name, handler);
  return () => {
    registry.delete(name);
  };
}

export async function scream(name: string, payload: any = {}, options: any = {}) {
  const handler = registry.get(String(name));
  if (handler) {
    return await handler(payload, options);
  }

  const bin = String(options?.bin || 'qflush');
  const args = Array.isArray(options?.args)
    ? options.args.map((value: unknown) => String(value))
    : ['run', String(name), JSON.stringify(payload ?? {})];

  return await new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options?.cwd || process.cwd(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';

    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, out, err });
        return;
      }
      reject(new Error(`[HORN] ${name} failed (${code}): ${err || out}`));
    });
  });
}

export function useHorn(scope: string) {
  return {
    scream: (event: string, payload?: any, options?: any) =>
      scream(`${scope}.${event}`, payload, options),
  };
}

export function listHorns() {
  return Array.from(registry.keys()).sort();
}
