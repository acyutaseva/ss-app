import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const checkInSchema = z.object({
  studentId: z.string().uuid(),
  eventId: z.string().uuid(),
  droppedBy: z.string().min(1).max(120).optional(),
  notes: z.string().max(500).optional()
});

const checkOutSchema = z.object({
  studentId: z.string().uuid(),
  eventId: z.string().uuid(),
  pickedByType: z.enum(['mother', 'father', 'authorized', 'other']),
  pickedByName: z.string().min(1).max(120),
  pickedByPhone: z.string().max(30).optional(),
  signatureUrl: z.string().url().optional(),
  notes: z.string().max(500).optional()
});

const getActiveEnrollment = async (studentId: string) => {
  const result = await pool.query(
    `SELECT se.id, se.group_id
     FROM student_enrollments se
     JOIN academic_years ay ON ay.id = se.academic_year_id
     WHERE se.student_id = $1 AND se.status = 'active' AND ay.is_active = true
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] || null;
};

const canAccessEnrollment = async (userId: string, role: string, groupId: string) => {
  if (role === 'admin') return true;
  const result = await pool.query(
    `SELECT 1
     FROM teacher_groups tg
     WHERE tg.group_id = $1 AND tg.teacher_id = $2
     LIMIT 1`,
    [groupId, userId]
  );
  return Boolean(result.rowCount);
};

const getEvent = async (eventId: string) => {
  const result = await pool.query(
    `SELECT id, event_date, start_time, end_time, attendance_mode FROM events WHERE id = $1 LIMIT 1`,
    [eventId]
  );
  return result.rows[0] || null;
};

const isPastEventForTeacher = (event: { event_date: string; end_time: string }) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 8);

  if (event.event_date < today) return true;
  if (event.event_date === today && event.end_time < currentTime) return true;
  return false;
};

export const checkInHandler = async (req: Request, res: Response) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const enrollment = await getActiveEnrollment(parsed.data.studentId);
  if (!enrollment) return res.status(400).json({ message: 'No active enrollment for this student in active academic year' });
  const access = await canAccessEnrollment(req.user.id, req.user.role, enrollment.group_id);
  if (!access) return res.status(403).json({ message: 'You cannot access this student' });

  const event = await getEvent(parsed.data.eventId);
  if (!event) return res.status(400).json({ message: 'Event not found' });
  if (req.user.role === 'teacher' && isPastEventForTeacher(event)) {
    return res.status(400).json({ message: 'Teachers cannot add attendance for past events' });
  }

  const insert = await pool.query(
    `INSERT INTO attendance_records
      (enrollment_id, event_id, checkin_time, dropped_by, notes, volunteer_id)
     VALUES ($1, $2, NOW(), $3, $4, $5)
     ON CONFLICT (enrollment_id, event_id) DO UPDATE
      SET checkin_time = EXCLUDED.checkin_time,
          dropped_by = EXCLUDED.dropped_by,
          notes = COALESCE(EXCLUDED.notes, attendance_records.notes),
          volunteer_id = EXCLUDED.volunteer_id
     RETURNING *`,
    [enrollment.id, parsed.data.eventId, parsed.data.droppedBy || null, parsed.data.notes || null, req.user?.id || null]
  );

  return res.json(insert.rows[0]);
};

export const checkOutHandler = async (req: Request, res: Response) => {
  const parsed = checkOutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const enrollment = await getActiveEnrollment(parsed.data.studentId);
  if (!enrollment) return res.status(400).json({ message: 'No active enrollment for this student in active academic year' });
  const access = await canAccessEnrollment(req.user.id, req.user.role, enrollment.group_id);
  if (!access) return res.status(403).json({ message: 'You cannot access this student' });

  const event = await getEvent(parsed.data.eventId);
  if (!event) return res.status(400).json({ message: 'Event not found' });
  if (event.attendance_mode === 'checkin_only') {
    return res.status(400).json({ message: 'Checkout is disabled for this event' });
  }
  if (req.user.role === 'teacher' && isPastEventForTeacher(event)) {
    return res.status(400).json({ message: 'Teachers cannot add attendance for past events' });
  }

  const existing = await pool.query(
    'SELECT id FROM attendance_records WHERE enrollment_id = $1 AND event_id = $2 LIMIT 1',
    [enrollment.id, parsed.data.eventId]
  );

  if (!existing.rowCount) {
    return res.status(400).json({ message: 'Student is not checked in for this event' });
  }

  const updated = await pool.query(
    `UPDATE attendance_records
     SET checkout_time = NOW(),
         picked_by_type = $1,
         picked_by_name = $2,
         picked_by_phone = $3,
         signature_url = $4,
         notes = COALESCE($5, notes)
     WHERE enrollment_id = $6 AND event_id = $7
     RETURNING *`,
    [
      parsed.data.pickedByType,
      parsed.data.pickedByName,
      parsed.data.pickedByPhone || null,
      parsed.data.signatureUrl || null,
      parsed.data.notes || null,
      enrollment.id,
      parsed.data.eventId
    ]
  );

  return res.json(updated.rows[0]);
};

export const termReportHandler = async (req: Request, res: Response) => {
  const termStart = String(req.query.termStart || '');
  const termEnd = String(req.query.termEnd || '');
  const academicYear = String(req.query.academicYear || '');

  if (!termStart || !termEnd) {
    return res.status(400).json({ message: 'termStart and termEnd are required (YYYY-MM-DD)' });
  }

  const values: string[] = [termStart, termEnd];
  const yearFilter = academicYear
    ? (values.push(academicYear), `AND ay.year_label = $${values.length}`)
    : 'AND ay.is_active = true';

  const report = await pool.query(
    `SELECT
      s.id AS student_id,
      s.full_name,
      g.name AS group_name,
      COUNT(e.id) FILTER (WHERE ar.checkin_time IS NOT NULL) AS present_days
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id
    JOIN academic_years ay ON ay.id = se.academic_year_id
    JOIN groups g ON g.id = se.group_id
    LEFT JOIN attendance_records ar ON ar.enrollment_id = se.id
    LEFT JOIN events e ON e.id = ar.event_id
      AND e.event_date BETWEEN $1 AND $2
    WHERE se.status = 'active'
      ${yearFilter}
    GROUP BY s.id, s.full_name, g.name
    ORDER BY g.name, s.full_name`,
    values
  );

  return res.json(report.rows);
};
