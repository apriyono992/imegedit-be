import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditExceptionFilter } from '../common/filters/audit-exception.filter';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';
import { LogHistory } from './log-history.entity';
import { LogHistoryController } from './log-history.controller';
import { LogHistoryService } from './log-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([LogHistory])],
  controllers: [LogHistoryController],
  providers: [
    LogHistoryService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AuditExceptionFilter,
    },
  ],
  exports: [LogHistoryService],
})
export class LogHistoryModule {}
