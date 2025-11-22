import path from 'path';

import { PluginRegister, SpyderContext } from './plugin-api';

export async function loadPlugins(ctx: SpyderContext) {
  const plugins: string[] = (ctx.config && ctx.config.plugins) || [];
  for (const p of plugins) {
    try {
      let mod: any;
      if (p.startsWith('.') || p.startsWith('/')) {
        // local plugin
        const full = path.resolve(p);
        mod = await import(full);
      } else {
        // npm package
        mod = await import(p);
      }
      const reg: PluginRegister = mod.default || mod.register;
      if (reg) await reg(ctx);
      ctx.log('Loaded plugin', p);
    } catch (e) {
      ctx.logError('Failed loading plugin', p, e);
    }
  }
}
