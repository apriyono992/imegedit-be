import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from './revoked-token.entity';

@Injectable()
export class RevokedTokensService {
  constructor(
    @InjectRepository(RevokedToken)
    private readonly revokedTokensRepository: Repository<RevokedToken>,
  ) {}

  async revoke(
    jti: string,
    userId: string | null,
    expiresAt: Date,
  ): Promise<void> {
    const exists = await this.revokedTokensRepository.findOne({
      where: { jti },
    });
    if (exists) {
      return;
    }
    await this.revokedTokensRepository.save(
      this.revokedTokensRepository.create({ jti, userId, expiresAt }),
    );
  }

  async isRevoked(jti: string): Promise<boolean> {
    const count = await this.revokedTokensRepository.count({ where: { jti } });
    return count > 0;
  }
}
