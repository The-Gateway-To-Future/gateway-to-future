import app from './app';
import { env } from './config/env';
import { db } from './config/database';
import { UserRepository } from './repositories/user.repository';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const PORT = env.PORT;

const bootstrap = async () => {
  try {
    // 1. Run migrations if using real DB
    if (!env.DB_MOCK && db.pool) {
      console.log('🔄 Running database migrations...');
      const migrationPath = path.join(__dirname, '../migrations/001_init.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await db.query(sql);
        console.log('✅ Database migrations applied successfully.');
      } else {
        console.warn('⚠️ Migration script not found at:', migrationPath);
      }

      // Test Connection
      const testResult = await db.query('SELECT NOW()');
      console.log('✅ Connected to PostgreSQL. Server Time:', testResult.rows[0].now);
    }

    // 2. Seed Initial Admin User
    const adminEmail = env.ADMIN_INIT_EMAIL;
    const existingAdmin = await UserRepository.findByEmail(adminEmail);
    if (!existingAdmin) {
      console.log(`👤 Seeding initial admin: ${adminEmail}...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(env.ADMIN_INIT_PASSWORD, salt);

      await UserRepository.create({
        name: 'Gateway Admin',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
        phone: '+919999999999',
        qualification: 'Master of Science',
        preferred_field: 'Admin Operations',
      });
      console.log('✅ Admin account seeded successfully.');
    } else {
      console.log('✅ Initial admin account already seeded.');
    }

    // 3. Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Gateway to Future backend listening on port ${PORT} in ${env.NODE_ENV} mode.`);
      console.log(`🖥️ Frontend Demo UI is available at: http://localhost:${PORT}`);
    });

    // Graceful Shutdown
    const handleShutdown = async () => {
      console.log('💤 Shutting down server and releasing pools...');
      server.close(async () => {
        if (!env.DB_MOCK && db.pool) {
          await db.pool.end();
          console.log('✅ PostgreSQL connection pool drained.');
        }
        console.log('👋 Good bye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

  } catch (err: any) {
    console.error('❌ Critical failure during bootstrap:', err.message);
    process.exit(1);
  }
};

bootstrap();
