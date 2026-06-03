import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesService } from './roles/roles.service';

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
    await app.get(RolesService).seedDefaults();
    logger.log('Seeding complete');
  } catch (err) {
    logger.error('Seeding failed', err instanceof Error ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void seed();
