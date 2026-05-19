import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

type TokenPayload = {
  sub?: string;
  name?: string;
  role?: string;
};

const auditableMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const hiddenKeys = new Set([
  'password',
  'newpassword',
  'token',
  'passwordhash',
  'password_hash',
  'signatureurl',
  'signature_url'
]);

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (hiddenKeys.has(lower)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = sanitizeValue(item);
      }
    }
    return output;
  }

  if (typeof value === 'string' && value.length > 1000) {
    return `${value.slice(0, 1000)}...[truncated]`;
  }

  return value;
};

const extractEntity = (path: string) => {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  if (!parts.length) return { entityType: null as string | null, entityId: null as string | null };

  // Ignore api prefix when present.
  const first = parts[0] === 'api' ? 1 : 0;
  const entityType = parts[first] || null;
  const entityId = parts[first + 1] || null;
  return { entityType, entityId };
};

const getActorFromToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { actorId: null as string | null, actorName: null as string | null, actorRole: null as string | null };

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    return {
      actorId: payload.sub || null,
      actorName: payload.name || null,
      actorRole: payload.role || null
    };
  } catch {
    return { actorId: null as string | null, actorName: null as string | null, actorRole: null as string | null };
  }
};

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!auditableMethods.has(req.method.toUpperCase())) {
    return next();
  }

  if (req.path === '/api/health') {
    return next();
  }

  const startedAt = Date.now();
  const requestBody = sanitizeValue(req.body ?? null);

  res.on('finish', () => {
    const { actorId, actorName, actorRole } = getActorFromToken(req);
    const { entityType, entityId } = extractEntity(req.originalUrl || req.path || '');

    const details = {
      query: sanitizeValue(req.query ?? null),
      body: requestBody,
      durationMs: Date.now() - startedAt,
      ip: req.ip
    };

    pool.query(
      `INSERT INTO audit_logs (actor_id, actor_name, actor_role, method, path, status_code, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        actorId,
        actorName,
        actorRole,
        req.method.toUpperCase(),
        req.originalUrl || req.path,
        res.statusCode,
        entityType,
        entityId,
        JSON.stringify(details)
      ]
    ).catch((error: unknown) => {
      console.error('Failed to write audit log:', error);
    });
  });

  return next();
};
