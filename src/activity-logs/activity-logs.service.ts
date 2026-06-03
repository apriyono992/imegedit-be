import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { ActivityLog } from './activity-log.entity';
import { QueryActivityLogsDto } from './dto/query-activity-logs.dto';

interface CreateLogInput {
  userId: string;
  toolName: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

const ACTIVITY_LOG_SORTABLE = {
  toolName: 'log.toolName',
  createdAt: 'log.createdAt',
};

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logsRepository: Repository<ActivityLog>,
  ) {}

  create(input: CreateLogInput): Promise<ActivityLog> {
    const log = this.logsRepository.create({
      userId: input.userId,
      toolName: input.toolName,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    return this.logsRepository.save(log);
  }

  findByUser(
    userId: string,
    query: QueryActivityLogsDto,
  ): Promise<PaginatedResult<ActivityLog>> {
    const qb = this.logsRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (query.toolName) {
      qb.andWhere('log.toolName = :toolName', { toolName: query.toolName });
    }

    return paginate(qb, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      searchableColumns: ['log.toolName', 'log.ipAddress'],
      sortableColumns: ACTIVITY_LOG_SORTABLE,
      defaultSortBy: 'createdAt',
    });
  }

  findAll(
    query: QueryActivityLogsDto,
  ): Promise<PaginatedResult<ActivityLog>> {
    const qb = this.logsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.toolName) {
      qb.andWhere('log.toolName = :toolName', { toolName: query.toolName });
    }

    return paginate(qb, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      searchableColumns: [
        'log.toolName',
        'log.ipAddress',
        'user.name',
        'user.email',
      ],
      sortableColumns: ACTIVITY_LOG_SORTABLE,
      defaultSortBy: 'createdAt',
    });
  }

  softDelete(id: string): Promise<unknown> {
    return this.logsRepository.softDelete(id);
  }
}
