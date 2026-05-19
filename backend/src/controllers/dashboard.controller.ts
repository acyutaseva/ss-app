import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const dashboardSummaryHandler = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const values: string[] = [];
  let teacherFilter = '';

  if (req.user.role === 'teacher') {
    values.push(req.user.id);
    teacherFilter = ` AND se.group_id IN (SELECT group_id FROM teacher_groups WHERE teacher_id = $${values.length})`;
  }

  const baseFrom = `
    FROM student_enrollments se
    JOIN academic_years ay ON ay.id = se.academic_year_id
  `;

  const baseWhere = `
    WHERE se.status = 'active' AND ay.is_active = true
    ${teacherFilter}
  `;

  const totalStudentsSql = `SELECT COUNT(*)::int AS count ${baseFrom} ${baseWhere}`;
  const paidSql = `SELECT COUNT(*)::int AS count ${baseFrom} ${baseWhere} AND se.is_paid = true`;
  const unpaidSql = `SELECT COUNT(*)::int AS count ${baseFrom} ${baseWhere} AND se.is_paid = false`;

  const todayAttendanceSql = `
    SELECT
      COUNT(*) FILTER (WHERE e.id IS NOT NULL AND ar.checkin_time IS NOT NULL)::int AS checked_in,
      COUNT(*) FILTER (WHERE e.id IS NOT NULL AND ar.checkout_time IS NOT NULL)::int AS checked_out,
      COUNT(*) FILTER (WHERE e.id IS NOT NULL AND ar.checkin_time IS NOT NULL AND ar.checkout_time IS NULL)::int AS pending_pickup
    ${baseFrom}
    LEFT JOIN attendance_records ar
      ON ar.enrollment_id = se.id
    LEFT JOIN events e
      ON e.id = ar.event_id
      AND e.event_date = CURRENT_DATE
    ${baseWhere}
  `;

  const birthdaysThisMonthSql = `
    SELECT
      s.id,
      s.full_name,
      s.date_of_birth,
      g.name AS group_name
    ${baseFrom}
    JOIN students s ON s.id = se.student_id
    JOIN groups g ON g.id = se.group_id
    ${baseWhere}
      AND s.date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM s.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    ORDER BY EXTRACT(DAY FROM s.date_of_birth), s.full_name
  `;

  const [totalStudents, paid, unpaid, todayAttendance, birthdaysThisMonth] = await Promise.all([
    pool.query(totalStudentsSql, values),
    pool.query(paidSql, values),
    pool.query(unpaidSql, values),
    pool.query(todayAttendanceSql, values),
    pool.query(birthdaysThisMonthSql, values)
  ]);

  return res.json({
    totalStudents: totalStudents.rows[0]?.count || 0,
    paidStudents: paid.rows[0]?.count || 0,
    unpaidStudents: unpaid.rows[0]?.count || 0,
    todayCheckedIn: todayAttendance.rows[0]?.checked_in || 0,
    todayCheckedOut: todayAttendance.rows[0]?.checked_out || 0,
    todayPendingPickup: todayAttendance.rows[0]?.pending_pickup || 0,
    birthdaysThisMonth: birthdaysThisMonth.rows
  });
};
