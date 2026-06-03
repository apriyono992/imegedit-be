import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogHistoryService } from '../../log-history/log-history.service';
import {
  AuditRequest,
  buildAuditRecord,
  shouldAudit,
} from '../audit/audit-log.util';

/** Audits state-changing actions that complete successfully. Failures are handled by AuditExceptionFilter. */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly logHistoryService: LogHistoryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<AuditRequest>();

    if (!shouldAudit(req)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const statusCode =
          http.getResponse<{ statusCode?: number }>().statusCode ?? null;
        void this.logHistoryService.record(buildAuditRecord(req, statusCode));
      }),
    );
  }
}
