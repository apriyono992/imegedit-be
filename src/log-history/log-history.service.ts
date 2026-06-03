import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { QueryLogHistoryDto } from './dto/query-log-history.dto';
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

  findAll(query: QueryLogHistoryDto): Promise<PaginatedResult<LogHistory>> {
    const qb = this.logHistoryRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (query.method) {
      qb.andWhere('log.method = :method', { method: query.method });
    }
    if (query.statusCode !== undefined) {
      qb.andWhere('log.statusCode = :statusCode', {
        statusCode: query.statusCode,
      });
    }
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }

    return paginate(qb, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      searchableColumns: [
        'log.action',
        'log.method',
        'log.path',
        'log.ipAddress',
        'log.userAgent',
        'user.name',
        'user.email',
      ],
      sortableColumns: {
        action: 'log.action',
        method: 'log.method',
        path: 'log.path',
        statusCode: 'log.statusCode',
        createdAt: 'log.createdAt',
      },
      defaultSortBy: 'createdAt',
    });
  }
}
