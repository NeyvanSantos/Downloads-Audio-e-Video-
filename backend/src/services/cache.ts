import { Client } from 'redis';

let redisClient: Client | null = null;

export const getRedisClient = async () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Client({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    },
    password: process.env.REDIS_PASSWORD || undefined
  });

  await redisClient.connect();
  return redisClient;
};

export const cacheMetadata = async (url: string, metadata: any, ttl: number = 3600) => {
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
