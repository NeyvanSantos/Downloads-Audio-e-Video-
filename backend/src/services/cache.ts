import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | undefined;
let connecting: Promise<unknown> | undefined;
export const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({ socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    }, password: process.env.REDIS_PASSWORD || undefined });
    redisClient.on('error', error => console.error('Redis:', error.message));
  }
  if (!redisClient.isOpen) {
    connecting ||= redisClient.connect().finally(() => { connecting = undefined; });
    await connecting;
  }
  return redisClient;
};
export const cacheMetadata = async (url: string, metadata: unknown, ttl = 3600) => {
  const client = await getRedisClient();
  await client.setEx(`metadata:${url}`, ttl, JSON.stringify(metadata));
};
export const getCachedMetadata = async (url: string) => {
  const client = await getRedisClient();
  const data = await client.get(`metadata:${url}`);
  return data ? JSON.parse(data) : null;
};
export const invalidateCache = async (url: string) => {
  const client = await getRedisClient();
  await client.del(`metadata:${url}`);
};
