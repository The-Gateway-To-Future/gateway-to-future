import { redis, isRedisReady } from '../config/redis';

// In-Memory cache fallback map
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

export class CacheService {
  /**
   * Set cache key with optional TTL (time to live in seconds)
   */
  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Try Redis first
    if (redis && isRedisReady()) {
      try {
        await redis.set(key, stringValue, 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        console.warn('⚠️ CacheService.set Redis failed, falling back to memory:', err.message);
      }
    }

    // In-Memory fallback
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { value: stringValue, expiresAt });
  }

  /**
   * Get cached value by key
   */
  static async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (redis && isRedisReady()) {
      try {
        const val = await redis.get(key);
        if (val) {
          try {
            return JSON.parse(val) as T;
          } catch {
            return val as unknown as T;
          }
        }
        return null;
      } catch (err: any) {
        console.warn('⚠️ CacheService.get Redis failed, falling back to memory:', err.message);
      }
    }

    // In-Memory fallback
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  /**
   * Delete cached key
   */
  static async del(key: string): Promise<void> {
    if (redis && isRedisReady()) {
      try {
        await redis.del(key);
        return;
      } catch (err: any) {
        console.warn('⚠️ CacheService.del Redis failed, falling back to memory:', err.message);
      }
    }

    memoryCache.delete(key);
  }

  /**
   * Clears expired keys from memory cache to prevent memory leaks
   */
  static cleanMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }
}

// Set up periodic cleaning of memory cache (every 5 minutes)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    CacheService.cleanMemoryCache();
  }, 300000);
}
