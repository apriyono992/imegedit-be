import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';

interface CreateLogInput {
  userId: string;
  toolName: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

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

  findByUser(userId: string): Promise<ActivityLog[]> {
    return this.logsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(): Promise<ActivityLog[]> {
    return this.logsRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  softDelete(id: string): Promise<unknown> {
    return this.logsRepository.softDelete(id);
  }
}
