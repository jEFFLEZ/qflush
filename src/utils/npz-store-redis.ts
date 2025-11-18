// ROME-TAG: 0xC27F4F

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { getNpzNamespace } from './npz-config';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const client = new Redis(REDIS_URL);
const NS = getNpzNamespace();

export type RedisNpzRecord = { id: string; laneId?: number; ts: number; meta?: Record<string, any> };

export async function createRecord(meta?: Record<string, any>) {
  const id = uuidv4();
  const rec: RedisNpzRecord = { id, ts: Date.now(), meta };
  const key = `${NS}:req:${id}`;
  await client.hset(key, rec as any);
  await client.expire(key, 24 * 3600);
  return rec;
}

export async function updateRecord(id: string, patch: Partial<RedisNpzRecord>) {
  const key = `${NS}:req:${id}`;
  const exists = await client.exists(key);
  if (!exists) return null;
  await client.hset(key, patch as any);
  return await client.hgetall(key);
}

export async function getRecord(id: string) {
  const key = `${NS}:req:${id}`;
  const res = await client.hgetall(key);
  if (!res || Object.keys(res).length === 0) return null;
  // convert ts/lane types
  return { ...res, ts: Number(res.ts), laneId: res.laneId ? Number(res.laneId) : undefined };
}

export default { createRecord, updateRecord, getRecord, client };