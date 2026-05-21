import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const eventSchema = z.object({
  name: z.string().min(2).max(160),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  attendanceMode: z.enum(['full', 'checkin_only']).default('full'),
  appliesAllGroups: z.boolean().default(true),
  groupIds: z.array(z.string().uuid()).default([]),
  notes: z.string().max(1000).optional()
});

const updateEventSchema = eventSchema.partial();

const eventReportSchema = z.object({
  taughtSummary: z.string().min(10).max(5000),
  otherNotes: z.string().max(5000).optional()
});

export const listEventsHandler = async (req: Request, res: Response) => {
  const mode = String(req.query.mode || '').trim();
  let sql = `
    SELECT
      e.id,
      e.name,
      e.event_date,
      e.start_time,
      e.end_time,
      e.attendance_mode,
      e.applies_all_groups,
      e.notes,
      EXISTS (
        SELECT 1
        FROM event_reports er
        WHERE er.event_id = e.id
      ) AS has_report,
      COALESCE(
        (
          SELECT JSON_AGG(eg.group_id ORDER BY eg.group_id)
          FROM event_groups eg
          WHERE eg.event_id = e.id
        ),
        '[]'::json
      ) AS group_ids
    FROM events e
  `;
  const values: string[] = [];

  if (mode === 'attendance' && req.user?.role === 'teacher') {
    values.push(req.user.id);
    sql += `
      WHERE (
        NOT EXISTS (SELECT 1 FROM teacher_groups tg WHERE tg.teacher_id = $1)
        OR e.applies_all_groups = true
        OR EXISTS (
          SELECT 1
          FROM event_groups eg
          JOIN teacher_groups tg ON tg.group_id = eg.group_id
          WHERE eg.event_id = e.id
            AND tg.teacher_id = $1
        )
      )
    `;
  }

  sql += ` ORDER BY e.event_date DESC, e.start_time DESC`;
  const result = await pool.query(sql, values);
  return res.json(result.rows);
};

export const createEventHandler = async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;
  const groupIds = Array.from(new Set(d.groupIds));
  if (!d.appliesAllGroups && !groupIds.length) {
    return res.status(400).json({ message: 'At least one group must be selected for this event' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO events (name, event_date, start_time, end_time, attendance_mode, applies_all_groups, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [d.name, d.eventDate, d.startTime, d.endTime, d.attendanceMode, d.appliesAllGroups, d.notes || null, req.user?.id || null]
    );

    if (!d.appliesAllGroups && groupIds.length) {
      for (const groupId of groupIds) {
        await client.query(
          `INSERT INTO event_groups (event_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (event_id, group_id) DO NOTHING`,
          [result.rows[0].id, groupId]
        );
      }
    }

    await client.query('COMMIT');

    const hydrated = await pool.query(
      `SELECT
        e.*,
        COALESCE((SELECT JSON_AGG(eg.group_id ORDER BY eg.group_id) FROM event_groups eg WHERE eg.event_id = e.id), '[]'::json) AS group_ids
       FROM events e
       WHERE e.id = $1`,
      [result.rows[0].id]
    );
    return res.status(201).json(hydrated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateEventHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  const current = await pool.query('SELECT * FROM events WHERE id = $1 LIMIT 1', [eventId]);
  if (!current.rowCount) return res.status(404).json({ message: 'Event not found' });
  const c = current.rows[0];

  const nextAppliesAllGroups = d.appliesAllGroups ?? c.applies_all_groups;
  const nextGroupIds = d.groupIds ? Array.from(new Set(d.groupIds)) : null;
  if (nextAppliesAllGroups === false && nextGroupIds && nextGroupIds.length === 0) {
    return res.status(400).json({ message: 'At least one group must be selected for this event' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE events
       SET name = $1,
           event_date = $2,
           start_time = $3,
           end_time = $4,
           attendance_mode = $5,
           applies_all_groups = $6,
           notes = $7
       WHERE id = $8`,
      [
        d.name ?? c.name,
        d.eventDate ?? c.event_date,
        d.startTime ?? c.start_time,
        d.endTime ?? c.end_time,
        d.attendanceMode ?? c.attendance_mode,
        nextAppliesAllGroups,
        d.notes ?? c.notes,
        eventId
      ]
    );

    if (nextAppliesAllGroups) {
      await client.query('DELETE FROM event_groups WHERE event_id = $1', [eventId]);
    } else if (nextGroupIds) {
      await client.query('DELETE FROM event_groups WHERE event_id = $1', [eventId]);
      for (const groupId of nextGroupIds) {
        await client.query(
          `INSERT INTO event_groups (event_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT (event_id, group_id) DO NOTHING`,
          [eventId, groupId]
        );
      }
    }

    await client.query('COMMIT');

    const result = await pool.query(
      `SELECT
        e.*,
        COALESCE((SELECT JSON_AGG(eg.group_id ORDER BY eg.group_id) FROM event_groups eg WHERE eg.event_id = e.id), '[]'::json) AS group_ids
       FROM events e
       WHERE e.id = $1`,
      [eventId]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

export const eventExportReportHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const values = [eventId];
  let teacherAccessSql = '';

  if (req.user?.role === 'teacher') {
    values.push(req.user.id);
    teacherAccessSql = `
      AND (
        NOT EXISTS (SELECT 1 FROM teacher_groups tg WHERE tg.teacher_id = $2)
        OR e.applies_all_groups = true
        OR EXISTS (
          SELECT 1
          FROM event_groups eg
          JOIN teacher_groups tg ON tg.group_id = eg.group_id
          WHERE eg.event_id = e.id
            AND tg.teacher_id = $2
        )
      )
    `;
  }

  const eventResult = await pool.query(
    `SELECT
      e.id,
      e.name,
      e.event_date,
      e.start_time,
      e.end_time,
      e.attendance_mode,
      e.applies_all_groups,
      e.notes,
      COALESCE(
        (
          SELECT JSON_AGG(g.name ORDER BY g.name)
          FROM event_groups eg
          JOIN groups g ON g.id = eg.group_id
          WHERE eg.event_id = e.id
        ),
        '[]'::json
      ) AS group_names
     FROM events e
     WHERE e.id = $1
     ${teacherAccessSql}
     LIMIT 1`,
    values
  );
  if (!eventResult.rowCount) return res.status(404).json({ message: 'Event not found' });

  const reportResult = await pool.query(
    `SELECT
      er.taught_summary,
      er.other_notes,
      er.submitted_at,
      er.updated_at,
      u.name AS submitted_by_name
     FROM event_reports er
     LEFT JOIN users u ON u.id = er.submitted_by
     WHERE er.event_id = $1
     LIMIT 1`,
    [eventId]
  );

  const attendanceResult = await pool.query(
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
       AND ar.checkin_time IS NOT NULL
       AND (
         EXISTS (
           SELECT 1
           FROM events e
           WHERE e.id = $1
             AND e.attendance_mode = 'checkin_only'
         )
         OR ar.checkout_time IS NOT NULL
       )
     ORDER BY g.name, s.full_name`,
    [eventId]
  );

  return res.json({
    event: eventResult.rows[0],
    report: reportResult.rows[0] || null,
    attended: attendanceResult.rows
  });
};

export const getEventReportHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const event = await pool.query('SELECT id FROM events WHERE id = $1 LIMIT 1', [eventId]);
  if (!event.rowCount) return res.status(404).json({ message: 'Event not found' });

  const result = await pool.query(
    `SELECT
      er.id,
      er.event_id,
      er.taught_summary,
      er.other_notes,
      er.submitted_by,
      u.name AS submitted_by_name,
      er.submitted_at,
      er.updated_at
     FROM event_reports er
     LEFT JOIN users u ON u.id = er.submitted_by
     WHERE er.event_id = $1
     LIMIT 1`,
    [eventId]
  );

  return res.json({ report: result.rows[0] || null });
};

export const upsertEventReportHandler = async (req: Request, res: Response) => {
  const eventId = String(req.params.eventId || '');
  const parsed = eventReportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const eventResult = await pool.query(
    `SELECT
      id,
      event_date <= CURRENT_DATE AS can_accept_teacher_report
     FROM events
     WHERE id = $1
     LIMIT 1`,
    [eventId]
  );
  if (!eventResult.rowCount) return res.status(404).json({ message: 'Event not found' });

  const event = eventResult.rows[0] as { id: string; can_accept_teacher_report: boolean };
  if (req.user.role === 'teacher' && !event.can_accept_teacher_report) {
    return res.status(400).json({ message: 'Teachers can submit event report only after event completion' });
  }

  const d = parsed.data;
  const taughtSummary = d.taughtSummary.trim();
  const otherNotes = d.otherNotes?.trim() || null;
  if (taughtSummary.length < 10) {
    return res.status(400).json({ message: 'What was taught must be at least 10 characters' });
  }

  const result = await pool.query(
    `INSERT INTO event_reports (event_id, taught_summary, other_notes, submitted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id) DO UPDATE
     SET taught_summary = EXCLUDED.taught_summary,
         other_notes = EXCLUDED.other_notes,
         submitted_by = EXCLUDED.submitted_by,
         updated_at = NOW()
     RETURNING id, event_id, taught_summary, other_notes, submitted_by, submitted_at, updated_at`,
    [eventId, taughtSummary, otherNotes, req.user.id]
  );

  const row = result.rows[0];
  const withUser = await pool.query(
    `SELECT
      $1::uuid AS id,
      $2::uuid AS event_id,
      $3::text AS taught_summary,
      $4::text AS other_notes,
      $5::uuid AS submitted_by,
      u.name AS submitted_by_name,
      $6::timestamptz AS submitted_at,
      $7::timestamptz AS updated_at
     FROM users u
     WHERE u.id = $5
     LIMIT 1`,
    [row.id, row.event_id, row.taught_summary, row.other_notes, row.submitted_by, row.submitted_at, row.updated_at]
  );

  return res.json(withUser.rows[0] || row);
};
