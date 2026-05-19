import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const eventSchema = z.object({
  name: z.string().min(2).max(160),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendanceMode: z.enum(['full', 'checkin_only']).default('full'),
  notes: z.string().max(1000).optional()
});

const updateEventSchema = eventSchema.partial();

export const listEventsHandler = async (req: Request, res: Response) => {
  const mode = String(req.query.mode || '').trim();
  let sql = `SELECT id, name, event_date, start_time, end_time, attendance_mode, notes FROM events`;
  const values: string[] = [];

  if (mode === 'attendance' && req.user?.role === 'teacher') {
    sql += ` WHERE event_date > CURRENT_DATE OR (event_date = CURRENT_DATE AND end_time >= CURRENT_TIME)`;
  }

  sql += ` ORDER BY event_date DESC, start_time DESC`;
  const result = await pool.query(sql, values);
  return res.json(result.rows);
};

export const createEventHandler = async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO events (name, event_date, start_time, end_time, attendance_mode, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [d.name, d.eventDate, d.startTime, d.endTime, d.attendanceMode, d.notes || null, req.user?.id || null]
  );
  return res.status(201).json(result.rows[0]);
};

export const updateEventHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  const current = await pool.query('SELECT * FROM events WHERE id = $1 LIMIT 1', [eventId]);
  if (!current.rowCount) return res.status(404).json({ message: 'Event not found' });
  const c = current.rows[0];

  const result = await pool.query(
    `UPDATE events
     SET name = $1,
         event_date = $2,
         start_time = $3,
         end_time = $4,
         attendance_mode = $5,
         notes = $6
     WHERE id = $7
     RETURNING *`,
    [
      d.name ?? c.name,
      d.eventDate ?? c.event_date,
      d.startTime ?? c.start_time,
      d.endTime ?? c.end_time,
      d.attendanceMode ?? c.attendance_mode,
      d.notes ?? c.notes,
      eventId
    ]
  );
  return res.json(result.rows[0]);
};

export const deleteEventHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
  return res.status(204).send();
};

export const eventAttendanceHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const result = await pool.query(
    `SELECT
      s.full_name,
      g.name AS group_name,
      ar.checkin_time,
      ar.checkout_time,
      ar.dropped_by,
      ar.picked_by_name,
      ar.picked_by_type,
      ar.notes
     FROM attendance_records ar
     JOIN student_enrollments se ON se.id = ar.enrollment_id
     JOIN students s ON s.id = se.student_id
     JOIN groups g ON g.id = se.group_id
     WHERE ar.event_id = $1
     ORDER BY s.full_name`,
    [eventId]
  );

  return res.json(result.rows);
};
