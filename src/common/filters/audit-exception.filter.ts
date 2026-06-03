import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { LogHistoryService } from '../../log-history/log-history.service';
import { AuditRequest, buildAuditRecord, shouldAudit } from '../audit/audit-log.util';

/**
 * Records an audit entry for any failed state-changing action — including
 * rejections thrown by guards (401/403) and pipes (400), which never reach
 * the interceptor — then delegates to the default exception handling.
 */
@Catch()
export class AuditExceptionFilter extends BaseExceptionFilter {
  constructor(
    adapterHost: HttpAdapterHost,
    private readonly logHistoryService: LogHistoryService,
  ) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<AuditRequest>();
      if (shouldAudit(req)) {
        const status =
          exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        void this.logHistoryService.record(buildAuditRecord(req, status));
      }
    }
    super.catch(exception, host);
  }
}
