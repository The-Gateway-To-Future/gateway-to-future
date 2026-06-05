"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("../config/redis");
const memoryCache = new Map();
class CacheService {
    /**
     * Set cache key with optional TTL (time to live in seconds)
     */
    static async set(key, value, ttlSeconds = 3600) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        // Try Redis first
        if (redis_1.redis && (0, redis_1.isRedisReady)()) {
            try {
                await redis_1.redis.set(key, stringValue, 'EX', ttlSeconds);
                return;
            }
            catch (err) {
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
    static async get(key) {
        // Try Redis first
        if (redis_1.redis && (0, redis_1.isRedisReady)()) {
            try {
                const val = await redis_1.redis.get(key);
                if (val) {
                    try {
                        return JSON.parse(val);
                    }
                    catch {
                        return val;
                    }
                }
                return null;
            }
            catch (err) {
                console.warn('⚠️ CacheService.get Redis failed, falling back to memory:', err.message);
            }
        }
        // In-Memory fallback
        const entry = memoryCache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            memoryCache.delete(key);
            return null;
        }
        try {
            return JSON.parse(entry.value);
        }
        catch {
            return entry.value;
        }
    }
    /**
     * Delete cached key
     */
    static async del(key) {
        if (redis_1.redis && (0, redis_1.isRedisReady)()) {
            try {
                await redis_1.redis.del(key);
                return;
            }
            catch (err) {
                console.warn('⚠️ CacheService.del Redis failed, falling back to memory:', err.message);
            }
        }
        memoryCache.delete(key);
    }
    /**
     * Clears expired keys from memory cache to prevent memory leaks
     */
    static cleanMemoryCache() {
        const now = Date.now();
        for (const [key, entry] of memoryCache.entries()) {
            if (now > entry.expiresAt) {
                memoryCache.delete(key);
            }
        }
    }
}
exports.CacheService = CacheService;
// Set up periodic cleaning of memory cache (every 5 minutes)
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        CacheService.cleanMemoryCache();
    }, 300000);
}
