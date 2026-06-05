import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone?: string;
  role: 'student' | 'admin';
  qualification?: string;
  preferred_field?: string;
  created_at: Date;
  updated_at: Date;
}

// In-Memory state for mock mode
const mockUsers = new Map<string, User>();

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    if (env.DB_MOCK) {
      for (const user of mockUsers.values()) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
          return { ...user };
        }
      }
      return null;
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  static async findById(id: string): Promise<User | null> {
    if (env.DB_MOCK) {
      const user = mockUsers.get(id);
      return user ? { ...user } : null;
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  static async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    if (env.DB_MOCK) {
      const newUser: User = {
        ...user,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockUsers.set(newUser.id, newUser);
      return { ...newUser };
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, phone, role, qualification, preferred_field)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, password_hash, phone, role, qualification, preferred_field, created_at, updated_at`,
      [
        user.name,
        user.email,
        user.password_hash,
        user.phone || null,
        user.role,
        user.qualification || null,
        user.preferred_field || null,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  static async clearMockData(): Promise<void> {
    mockUsers.clear();
  }
}
