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
export declare class UserRepository {
    static findByEmail(email: string): Promise<User | null>;
    static findById(id: string): Promise<User | null>;
    static create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
    static clearMockData(): Promise<void>;
}
