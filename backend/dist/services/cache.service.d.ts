export declare class CacheService {
    /**
     * Set cache key with optional TTL (time to live in seconds)
     */
    static set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    /**
     * Get cached value by key
     */
    static get<T>(key: string): Promise<T | null>;
    /**
     * Delete cached key
     */
    static del(key: string): Promise<void>;
    /**
     * Clears expired keys from memory cache to prevent memory leaks
     */
    static cleanMemoryCache(): void;
}
