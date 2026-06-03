import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { RolesService } from './roles/roles.service';
import { UsersService } from './users/users.service';

/**
 * Standalone seeder. Run with `npm run seed`.
 * Boots the application context (no HTTP server) and seeds default data.
 */
async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const roles = app.get(RolesService);
    const users = app.get(UsersService);
    const config = app.get(ConfigService);

    // 1. Default roles
    await roles.seedDefaults();

    // 2. Default admin user (idempotent)
    const email = config.get<string>('ADMIN_EMAIL', 'admin@example.com');
    const existing = await users.findByEmail(email);
    if (existing) {
      logger.log(`Admin user already exists: ${email}`);
    } else {
      const name = config.get<string>('ADMIN_NAME', 'Administrator');
      const password = config.get<string>('ADMIN_PASSWORD', 'ChangeMe123!');
      const adminRole = await roles.findOrCreate('admin');
      await users.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        roleId: adminRole.id,
      });
      logger.log(`Admin user created: ${email}`);
      if (!config.get<string>('ADMIN_PASSWORD')) {
        logger.warn(
          'Admin created with the DEFAULT password "ChangeMe123!" — change it or set ADMIN_PASSWORD.',
        );
      }
    }

    logger.log('Seeding complete');
  } catch (err) {
    logger.error('Seeding failed', err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void seed();
