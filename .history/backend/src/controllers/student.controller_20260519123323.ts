import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const listStudentsHandler = async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim();
  const groupId = String(req.query.groupId || '').trim();
  const academicYear = String(req.query.academicYear || '').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(15, Math.max(1, Number(req.query.pageSize || 15)));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const values: string[] = [];

  if (search) {
    values.push(`%${search}%`);
    where.push(`s.full_name ILIKE $${values.length}`);
  }

  if (groupId) {
    values.push(groupId);
    where.push(`se.group_id = $${values.length}`);
  }

  if (req.user?.role === 'teacher') {
    values.push(req.user.id);
    where.push(`se.group_id IN (SELECT group_id FROM teacher_groups WHERE teacher_id = $${values.length})`);
  }

  if (academicYear) {
    values.push(academicYear);
    where.push(`ay.year_label = $${values.length}`);
  } else {
    where.push(`ay.is_active = true`);
  }

  const baseFromWhere = `
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id
    JOIN groups g ON g.id = se.group_id
    JOIN academic_years ay ON ay.id = se.academic_year_id
    WHERE se.status = 'active'
    ${where.length ? `AND ${where.join(' AND ')}` : ''}
  `;

  const countSql = `SELECT COUNT(*)::int AS total ${baseFromWhere}`;
  const countResult = await pool.query(countSql, values);
  const total = countResult.rows[0]?.total || 0;

  const rowValues = [...values, String(pageSize), String(offset)];
  const sql = `
    SELECT
      s.id,
      s.full_name,
      s.date_of_birth,
      s.father_name,
      s.mother_name,
      s.mobile_number,
      s.email,
      s.current_address,
      s.hobbies_or_interests,
      s.medical_needs_or_allergies,
      se.id AS enrollment_id,
      se.group_id,
      se.school_year_id,
      se.status,
      se.is_paid,
      se.paid_at,
      se.payment_note,
      g.name AS group_name,
      ay.year_label AS academic_year
    ${baseFromWhere}
    ORDER BY s.full_name
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const result = await pool.query(sql, rowValues);
  return res.json({
    items: result.rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
};
