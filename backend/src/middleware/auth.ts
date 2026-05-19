import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AuthUser, UserRole } from '../types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type TokenPayload = {
  sub: string;
  name: string;
  role: UserRole;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;

    pool.query(
      `SELECT id, name, role
       FROM users
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [payload.sub]
    ).then((result) => {
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ message: 'Session expired. Please login again.' });
      }

      req.user = { id: user.id, name: user.name, role: user.role };
      return next();
    }).catch(() => {
      return res.status(500).json({ message: 'Authentication lookup failed' });
    });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
};
