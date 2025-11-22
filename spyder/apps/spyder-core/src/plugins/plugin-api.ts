import { SpiderWeb } from '../graph/web';
import { RamMemory } from '../memory/ram';
import { CacheMemory } from '../memory/cache';
import { DeadMemory } from '../memory/dead';

export type SpyderContext = {
  web: SpiderWeb;
  ram: RamMemory;
  cache: CacheMemory;
  dead: DeadMemory;
  config: any;
  registerDecoder: (prefix: string, fn: (input: Uint8Array) => Promise<any>) => void;
  askA11: (endpoint: string, text: string) => Promise<any>;
  log: (...args: any[]) => void;
  logError: (...args: any[]) => void;
};

export type PluginRegister = (ctx: SpyderContext) => void | Promise<void>;
