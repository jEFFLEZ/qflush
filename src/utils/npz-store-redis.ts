// ROME-TAG: 0xC27F4F

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { getNpzNamespace } from './npz-config';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ENABLE_REDIS = (process.env.QFLUSH_ENABLE_REDIS === '1' || String(process.env.QFLUSH_ENABLE_REDIS).toLowerCase() === 'true');

let client: any = null;
if (ENABLE_REDIS && REDIS_URL) {
  client = new Redis(REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: true });
  client.on('error', (err: any) => { try { console.warn('[ioredis] client error:', String(err)); } catch (e) {} });
  client.on('connect', () => { try { console.log('[ioredis] connected to', REDIS_URL); } catch (e) {} });
  client.on('close', () => { try { console.warn('[ioredis] connection closed'); } catch (e) {} });
  client.on('reconnecting', (delay: number) => { try { console.log('[ioredis] reconnecting in', delay, 'ms'); } catch (e) {} });
} else {
  console.log('Redis disabled for NPZ store (set QFLUSH_ENABLE_REDIS=1 to enable)');
}

const NS = getNpzNamespace();

export type RedisNpzRecord = { id: string; laneId?: number; ts: number; meta?: Record<string, any> };

export async function createRecord(meta?: Record<string, any>) {
  if (!client) {
    throw new Error('Redis client not enabled');
  }
  const id = uuidv4();
  const rec: RedisNpzRecord = { id, ts: Date.now(), meta };
  const key = `${NS}:req:${id}`;
  await client.hset(key, rec as any);
  await client.expire(key, 24 * 3600);
  return rec;
}

export async function updateRecord(id: string, patch: Partial<RedisNpzRecord>) {
  if (!client) throw new Error('Redis client not enabled');
  const key = `${NS}:req:${id}`;
  const exists = await client.exists(key);
  if (!exists) return null;
  await client.hset(key, patch as any);
  return await client.hgetall(key);
}

export async function getRecord(id: string) {
  if (!client) throw new Error('Redis client not enabled');
  const key = `${NS}:req:${id}`;
  const res = await client.hgetall(key);
  if (!res || Object.keys(res).length === 0) return null;
  return { ...res, ts: Number(res.ts), laneId: res.laneId ? Number(res.laneId) : undefined };
}

export default { createRecord, updateRecord, getRecord, client };