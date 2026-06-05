"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisReady = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let redisClient = null;
if (!env_1.env.REDIS_MOCK) {
    try {
        redisClient = new ioredis_1.default(env_1.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            connectTimeout: 2000,
        });
        redisClient.on('error', (err) => {
            console.warn('⚠️ Redis connection error, bypassing cache:', err.message);
        });
    }
    catch (err) {
        console.warn('⚠️ Failed to initialize Redis client, bypassing cache:', err.message);
    }
}
else {
    console.log('⚠️ Redis Mock Mode Enabled. Caching will use in-memory fallbacks.');
}
exports.redis = redisClient;
const isRedisReady = () => redisClient !== null && redisClient.status === 'ready';
exports.isRedisReady = isRedisReady;
