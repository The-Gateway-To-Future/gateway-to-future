"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
let pool = null;
if (!env_1.env.DB_MOCK) {
    pool = new pg_1.Pool({
        connectionString: env_1.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
    pool.on('error', (err) => {
        console.error('Unexpected error on idle database client', err);
    });
}
else {
    console.log('⚠️ Database Mock Mode Enabled. Database connections will not be established.');
}
exports.db = {
    query: async (text, params) => {
        if (env_1.env.DB_MOCK) {
            throw new Error('Database is in Mock Mode. Avoid calling db.query directly.');
        }
        if (!pool) {
            throw new Error('Database pool not initialized.');
        }
        return pool.query(text, params);
    },
    pool,
};
