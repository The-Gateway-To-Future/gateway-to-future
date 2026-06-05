import Redis from 'ioredis';
import { env } from './env';

let redisClient: any = null;

if (!env.REDIS_MOCK) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 2000,
    });

    redisClient.on('error', (err: any) => {
      console.warn('⚠️ Redis connection error, bypassing cache:', err.message);
    });
  } catch (err: any) {
    console.warn('⚠️ Failed to initialize Redis client, bypassing cache:', err.message);
  }
} else {
  console.log('⚠️ Redis Mock Mode Enabled. Caching will use in-memory fallbacks.');
}

export const redis = redisClient;
export const isRedisReady = () => redisClient !== null && redisClient.status === 'ready';
