import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogHistory } from './log-history.entity';

export interface CreateLogHistoryInput {
  userId?: string | null;
  action: string;
  method: string;
  path: string;
  statusCode?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class LogHistoryService {
  private readonly logger = new Logger(LogHistoryService.name);

  constructor(
    @InjectRepository(LogHistory)
    private readonly logHistoryRepository: Repository<LogHistory>,
  ) {}

  /** Persist an audit record. Failures are swallowed so auditing never breaks the request. */
  async record(input: CreateLogHistoryInput): Promise<void> {
    try {
      const entry = this.logHistoryRepository.create({
        userId: input.userId ?? null,
        action: input.action,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? null,
      });
      await this.logHistoryRepository.save(entry);
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for ${input.action}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  findAll(): Promise<LogHistory[]> {
    return this.logHistoryRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }
}
