"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
// In-Memory state for mock mode
const mockUsers = new Map();
class UserRepository {
    static async findByEmail(email) {
        if (env_1.env.DB_MOCK) {
            for (const user of mockUsers.values()) {
                if (user.email.toLowerCase() === email.toLowerCase()) {
                    return { ...user };
                }
            }
            return null;
        }
        const result = await database_1.db.query('SELECT id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }
    static async findById(id) {
        if (env_1.env.DB_MOCK) {
            const user = mockUsers.get(id);
            return user ? { ...user } : null;
        }
        const result = await database_1.db.query('SELECT id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }
    static async create(user) {
        if (env_1.env.DB_MOCK) {
            const newUser = {
                ...user,
                id: crypto_1.default.randomUUID(),
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockUsers.set(newUser.id, newUser);
            return { ...newUser };
        }
        const result = await database_1.db.query(`INSERT INTO users (name, email, password_hash, phone, role, qualification, preferred_field)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at`, [
            user.name,
            user.email,
            user.password_hash,
            user.phone || null,
            user.role,
            user.qualification || null,
            user.preferred_field || null,
        ]);
        const row = result.rows[0];
        return {
            ...row,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }
    static async clearMockData() {
        mockUsers.clear();
    }
}
exports.UserRepository = UserRepository;
