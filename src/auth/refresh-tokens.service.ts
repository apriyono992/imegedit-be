import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { LessThan, Repository } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

@Injectable()
export class RefreshTokensService {
  private readonly logger = new Logger(RefreshTokensService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  /** High-entropy random tokens only need a fast deterministic hash for lookup. */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Issue a new refresh token for the user; returns the raw token (shown once). */
  async issue(userId: string, ttlMs: number): Promise<string> {
    const token = randomBytes(48).toString('hex');
    const entity = this.refreshTokensRepository.create({
      userId,
      tokenHash: this.hash(token),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    await this.refreshTokensRepository.save(entity);
    return token;
  }

  /** Return the stored token if it exists, is not revoked, and has not expired. */
  async findValid(token: string): Promise<RefreshToken | null> {
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash: this.hash(token) },
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return stored;
  }

  /** Revoke a single refresh token (soft delete). */
  async revoke(token: string): Promise<void> {
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash: this.hash(token) },
    });
    if (stored) {
      await this.refreshTokensRepository.softDelete(stored.id);
    }
  }

  /** Revoke every active refresh token for a user (logout from all devices). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokensRepository.softDelete({ userId });
  }

  /**
   * Hard-delete refresh tokens past their expiry (both revoked and active-but-expired);
   * an expired token is invalid regardless, so the row is just dead weight.
   * Uses a raw DELETE so soft-deleted rows are purged too. Runs hourly.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<number> {
    const result = await this.refreshTokensRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    const removed = result.affected ?? 0;
    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired refresh token(s)`);
    }
    return removed;
  }
}
