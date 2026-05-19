import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const listStudentsHandler = async (req: Request, res: Response) => {
  const mode = String(req.query.mode || '').trim();
  const search = String(req.query.search || '').trim();
  const groupId = String(req.query.groupId || '').trim();
  const academicYear = String(req.query.academicYear || '').trim();
  const eventId = String(req.query.eventId || '').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const maxPageSize = mode === 'attendance' ? 500 : 15;
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(req.query.pageSize || 10)));
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

  const eventJoin = eventId
    ? `LEFT JOIN attendance_records ar ON ar.enrollment_id = se.id AND ar.event_id = $${values.length + 1}`
    : `LEFT JOIN attendance_records ar ON 1 = 0`;

  const baseFromWhere = `
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id
    JOIN groups g ON g.id = se.group_id
    JOIN school_years sy ON sy.id = se.school_year_id
    JOIN academic_years ay ON ay.id = se.academic_year_id
    ${eventJoin}
    WHERE se.status = 'active'
    ${where.length ? `AND ${where.join(' AND ')}` : ''}
  `;

  const baseValues = eventId ? [...values, eventId] : values;

  const countSql = `SELECT COUNT(*)::int AS total ${baseFromWhere}`;
  const countResult = await pool.query(countSql, baseValues);
  const total = countResult.rows[0]?.total || 0;

  const rowValues = [...baseValues, String(pageSize), String(offset)];
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
      se.payment_amount,
      se.paid_at,
      se.payment_note,
      g.name AS group_name,
      sy.name AS school_year_name,
      ay.year_label AS academic_year,
      ar.checkin_time,
      ar.checkout_time
    ${baseFromWhere}
    ORDER BY s.full_name
    LIMIT $${baseValues.length + 1}
    OFFSET $${baseValues.length + 2}
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
