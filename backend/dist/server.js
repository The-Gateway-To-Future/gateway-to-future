"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const user_repository_1 = require("./repositories/user.repository");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PORT = env_1.env.PORT;
const bootstrap = async () => {
    try {
        // 1. Run migrations if using real DB
        if (!env_1.env.DB_MOCK && database_1.db.pool) {
            console.log('🔄 Running database migrations...');
            const migrationPath = path_1.default.join(__dirname, '../migrations/001_init.sql');
            if (fs_1.default.existsSync(migrationPath)) {
                const sql = fs_1.default.readFileSync(migrationPath, 'utf8');
                await database_1.db.query(sql);
                console.log('✅ Database migrations applied successfully.');
            }
            else {
                console.warn('⚠️ Migration script not found at:', migrationPath);
            }
            // Test Connection
            const testResult = await database_1.db.query('SELECT NOW()');
            console.log('✅ Connected to PostgreSQL. Server Time:', testResult.rows[0].now);
        }
        // 2. Seed Initial Admin User
        const adminEmail = env_1.env.ADMIN_INIT_EMAIL;
        const existingAdmin = await user_repository_1.UserRepository.findByEmail(adminEmail);
        if (!existingAdmin) {
            console.log(`👤 Seeding initial admin: ${adminEmail}...`);
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(env_1.env.ADMIN_INIT_PASSWORD, salt);
            await user_repository_1.UserRepository.create({
                name: 'Gateway Admin',
                email: adminEmail,
                password_hash: passwordHash,
                role: 'admin',
                phone: '+919999999999',
                qualification: 'Master of Science',
                preferred_field: 'Admin Operations',
            });
            console.log('✅ Admin account seeded successfully.');
        }
        else {
            console.log('✅ Initial admin account already seeded.');
        }
        // 3. Start Express server
        const server = app_1.default.listen(PORT, () => {
            console.log(`🚀 Gateway to Future backend listening on port ${PORT} in ${env_1.env.NODE_ENV} mode.`);
            console.log(`🖥️ Frontend Demo UI is available at: http://localhost:${PORT}`);
        });
        // Graceful Shutdown
        const handleShutdown = async () => {
            console.log('💤 Shutting down server and releasing pools...');
            server.close(async () => {
                if (!env_1.env.DB_MOCK && database_1.db.pool) {
                    await database_1.db.pool.end();
                    console.log('✅ PostgreSQL connection pool drained.');
                }
                console.log('👋 Good bye!');
                process.exit(0);
            });
        };
        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);
    }
    catch (err) {
        console.error('❌ Critical failure during bootstrap:', err.message);
        process.exit(1);
    }
};
bootstrap();
