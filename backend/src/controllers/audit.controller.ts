import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const listAuditLogsHandler = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  const search = String(req.query.search || '').trim();
  const method = String(req.query.method || '').trim().toUpperCase();

  const where: string[] = [];
  const values: string[] = [];

  if (method) {
    values.push(method);
    where.push(`al.method = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(
      COALESCE(al.actor_name, '') ILIKE $${values.length}
      OR COALESCE(al.path, '') ILIKE $${values.length}
      OR COALESCE(al.entity_type, '') ILIKE $${values.length}
      OR COALESCE(al.entity_id, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS total FROM audit_logs al ${whereClause}`;
  const countResult = await pool.query(countSql, values);
  const total = countResult.rows[0]?.total || 0;

  const rowValues = [...values, String(pageSize), String(offset)];
  const rowsSql = `
    SELECT
      al.id,
      al.actor_id,
      al.actor_name,
      al.actor_role,
      al.method,
      al.path,
      al.status_code,
      al.entity_type,
      al.entity_id,
      al.details,
      al.created_at
    FROM audit_logs al
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const result = await pool.query(rowsSql, rowValues);

  return res.json({
    items: result.rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
};
