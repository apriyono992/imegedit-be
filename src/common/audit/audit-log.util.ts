import { User } from '../../users/user.entity';
import { CreateLogHistoryInput } from '../../log-history/log-history.service';

const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken'];

// Methods that represent a state-changing user action worth auditing.
export const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface AuditRequest {
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  route?: { path?: string };
  params?: Record<string, any>;
  body?: unknown;
  headers: Record<string, any>;
  user?: User;
}

export function shouldAudit(req: AuditRequest): boolean {
  return AUDITED_METHODS.has(req.method);
}

/** Strip sensitive fields from a request body before persisting. */
function sanitize(body: unknown): Record<string, any> | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const clone: Record<string, any> = { ...(body as Record<string, any>) };
  for (const key of SENSITIVE_KEYS) {
    if (key in clone) {
      clone[key] = '***';
    }
  }
  return clone;
}

/** Build a log-history record from the incoming request and final status code. */
export function buildAuditRecord(
  req: AuditRequest,
  statusCode: number | null,
): CreateLogHistoryInput {
  return {
    userId: req.user?.id ?? null,
    action: `${req.method} ${req.route?.path ?? req.originalUrl ?? req.url}`,
    method: req.method,
    path: req.originalUrl ?? req.url,
    statusCode,
    ipAddress: req.ip ?? null,
    userAgent: (req.headers['user-agent'] as string) ?? null,
    metadata: {
      params: req.params ?? {},
      body: sanitize(req.body),
    },
  };
}
