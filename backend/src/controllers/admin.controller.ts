import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const createStudentSchema = z.object({
  fullName: z.string().min(2).max(140),
  submissionDate: z.string().optional(),
  schoolYearId: z.string().uuid(),
  dateOfBirth: z.string().optional(),
  groupId: z.string().uuid(),
  fatherName: z.string().max(140).optional(),
  motherName: z.string().max(140).optional(),
  mobileNumber: z.string().max(40).optional(),
  email: z.string().email().optional(),
  currentAddress: z.string().max(500).optional(),
  hobbiesOrInterests: z.string().max(1500).optional(),
  medicalNeedsOrAllergies: z.string().max(1500).optional()
});

const createGuardianSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().min(2).max(140),
  phone: z.string().max(40).optional(),
  relation: z.string().max(60).optional()
});

const createTeacherSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6)
});

const assignTeacherGroupSchema = z.object({
  teacherId: z.string().uuid(),
  groupId: z.string().uuid()
});

const createAcademicYearSchema = z.object({
  yearLabel: z.string().min(4).max(20),
  isActive: z.boolean().optional()
});

const rolloverSchema = z.object({
  fromYearLabel: z.string().min(4).max(20),
  toYearLabel: z.string().min(4).max(20)
});

const updatePaymentSchema = z.object({
  isPaid: z.boolean(),
  paymentNote: z.string().max(500).optional(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phoneNumber: z.string().max(40).optional(),
  role: z.enum(['admin', 'teacher']),
  password: z.string().min(6)
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120),
  phoneNumber: z.string().max(40).optional(),
  role: z.enum(['admin', 'teacher']),
  isActive: z.boolean(),
  password: z.string().min(6).optional()
});

const updateStudentSchema = z.object({
  fullName: z.string().min(2).max(140),
  dateOfBirth: z.string().optional(),
  fatherName: z.string().max(140).optional(),
  motherName: z.string().max(140).optional(),
  mobileNumber: z.string().max(40).optional(),
  email: z.string().email().optional(),
  currentAddress: z.string().max(500).optional(),
  hobbiesOrInterests: z.string().max(1500).optional(),
  medicalNeedsOrAllergies: z.string().max(1500).optional(),
  enrollmentId: z.string().uuid(),
  groupId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
  status: z.enum(['active', 'archived', 'left']).optional()
});

export const createStudentHandler = async (req: Request, res: Response) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  const allowed = await pool.query(
    `SELECT 1
     FROM group_school_years
     WHERE group_id = $1 AND school_year_id = $2
     LIMIT 1`,
    [d.groupId, d.schoolYearId]
  );
  if (!allowed.rowCount) {
    return res.status(400).json({ message: 'Selected school year is not mapped to selected group' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const studentResult = await client.query(
      `INSERT INTO students (
      submission_date, full_name, date_of_birth, father_name, mother_name,
      mobile_number, email, current_address, hobbies_or_interests, medical_needs_or_allergies
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, full_name`,
      [
        d.submissionDate || null,
        d.fullName,
        d.dateOfBirth || null,
        d.fatherName || null,
        d.motherName || null,
        d.mobileNumber || null,
        d.email || null,
        d.currentAddress || null,
        d.hobbiesOrInterests || null,
        d.medicalNeedsOrAllergies || null
      ]
    );

    const student = studentResult.rows[0];
    const activeYear = await client.query(
      'SELECT id, year_label FROM academic_years WHERE is_active = true LIMIT 1'
    );
    if (!activeYear.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No active academic year is configured' });
    }

    await client.query(
      `INSERT INTO student_enrollments (student_id, academic_year_id, group_id, school_year_id, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [student.id, activeYear.rows[0].id, d.groupId, d.schoolYearId]
    );

    await client.query('COMMIT');
    return res.status(201).json({ ...student, academic_year: activeYear.rows[0].year_label });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createGuardianHandler = async (req: Request, res: Response) => {
  const parsed = createGuardianSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO guardians (student_id, full_name, phone, relation)
     VALUES ($1, $2, $3, $4)
     RETURNING id, student_id, full_name`,
    [d.studentId, d.fullName, d.phone || null, d.relation || null]
  );

  return res.status(201).json(result.rows[0]);
};

export const listTeachersHandler = async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email,
      ARRAY_REMOVE(ARRAY_AGG(g.name), NULL) AS groups
     FROM users u
     LEFT JOIN teacher_groups tg ON tg.teacher_id = u.id
     LEFT JOIN groups g ON g.id = tg.group_id
     WHERE u.role = 'teacher'
     GROUP BY u.id
     ORDER BY u.name`
  );

  return res.json(result.rows);
};

export const createTeacherHandler = async (req: Request, res: Response) => {
  const parsed = createTeacherSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'teacher')
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = 'teacher',
       is_active = true
     RETURNING id, name, email, role`,
    [d.name, d.email, passwordHash]
  );

  return res.status(201).json(result.rows[0]);
};

export const assignTeacherGroupHandler = async (req: Request, res: Response) => {
  const parsed = assignTeacherGroupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  await pool.query(
    `INSERT INTO teacher_groups (teacher_id, group_id)
     VALUES ($1, $2)
     ON CONFLICT (teacher_id, group_id) DO NOTHING`,
    [d.teacherId, d.groupId]
  );

  return res.status(204).send();
};

export const listAcademicYearsHandler = async (_req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, year_label, is_active FROM academic_years ORDER BY year_label DESC'
  );
  return res.json(result.rows);
};

export const createAcademicYearHandler = async (req: Request, res: Response) => {
  const parsed = createAcademicYearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (d.isActive) {
      await client.query('UPDATE academic_years SET is_active = false');
    }
    const result = await client.query(
      `INSERT INTO academic_years (year_label, is_active)
       VALUES ($1, $2)
       ON CONFLICT (year_label) DO UPDATE
       SET is_active = EXCLUDED.is_active
       RETURNING id, year_label, is_active`,
      [d.yearLabel, Boolean(d.isActive)]
    );
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const rolloverAcademicYearHandler = async (req: Request, res: Response) => {
  const parsed = rolloverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const { fromYearLabel, toYearLabel } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const years = await client.query(
      'SELECT id, year_label FROM academic_years WHERE year_label = ANY($1::text[])',
      [[fromYearLabel, toYearLabel]]
    );
    const fromYear = years.rows.find((r) => r.year_label === fromYearLabel);
    const toYear = years.rows.find((r) => r.year_label === toYearLabel);
    if (!fromYear || !toYear) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Both academic years must exist' });
    }

    const inserted = await client.query(
      `INSERT INTO student_enrollments (student_id, academic_year_id, group_id, school_year_id, status)
       SELECT se.student_id, $2, se.group_id, se.school_year_id, 'active'
       FROM student_enrollments se
       WHERE se.academic_year_id = $1
         AND se.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM student_enrollments x
           WHERE x.student_id = se.student_id AND x.academic_year_id = $2
         )
       RETURNING id`,
      [fromYear.id, toYear.id]
    );

    await client.query(
      `UPDATE student_enrollments
       SET status = 'archived'
       WHERE academic_year_id = $1 AND status = 'active'`,
      [fromYear.id]
    );

    await client.query('UPDATE academic_years SET is_active = false');
    await client.query('UPDATE academic_years SET is_active = true WHERE id = $1', [toYear.id]);
    await client.query('COMMIT');

    return res.json({
      message: 'Rollover completed',
      fromYear: fromYearLabel,
      toYear: toYearLabel,
      createdEnrollments: inserted.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateEnrollmentPaymentHandler = async (req: Request, res: Response) => {
  const enrollmentId = String(req.params.enrollmentId || '');
  if (!enrollmentId) return res.status(400).json({ message: 'enrollmentId is required' });

  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  const result = await pool.query(
    `UPDATE student_enrollments
     SET
       is_paid = $1,
       paid_at = CASE WHEN $1 THEN COALESCE(($3::date)::timestamp, NOW()) ELSE NULL END,
       payment_note = $2
     WHERE id = $4
     RETURNING id, is_paid, paid_at, payment_note`,
    [d.isPaid, d.paymentNote || null, d.paidOn || null, enrollmentId]
  );

  if (!result.rowCount) return res.status(404).json({ message: 'Enrollment not found' });
  return res.json(result.rows[0]);
};

export const listUsersHandler = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(15, Math.max(1, Number(req.query.pageSize || 15)));
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  const total = countResult.rows[0]?.total || 0;

  const result = await pool.query(
    `SELECT id, name, email, phone_number, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1
     OFFSET $2`,
    [pageSize, offset]
  );

  return res.json({
    items: result.rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  });
};

export const createUserHandler = async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, phone_number, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       phone_number = EXCLUDED.phone_number,
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       is_active = true
     RETURNING id, name, email, phone_number, role, is_active`,
    [d.name, d.email, d.phoneNumber || null, passwordHash, d.role]
  );
  return res.status(201).json(result.rows[0]);
};

export const updateUserHandler = async (req: Request, res: Response) => {
  const userId = String(req.params.userId || '');
  if (!userId) return res.status(400).json({ message: 'userId is required' });
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  if (d.password) {
    const passwordHash = await bcrypt.hash(d.password, 10);
    const result = await pool.query(
      `UPDATE users
       SET name = $1, role = $2, is_active = $3, phone_number = COALESCE($4, phone_number), password_hash = $5
       WHERE id = $6
       RETURNING id, name, email, phone_number, role, is_active`,
      [d.name, d.role, d.isActive, d.phoneNumber || null, passwordHash, userId]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'User not found' });
    return res.json(result.rows[0]);
  }

  const result = await pool.query(
    `UPDATE users
     SET name = $1, role = $2, is_active = $3, phone_number = COALESCE($4, phone_number)
     WHERE id = $5
     RETURNING id, name, email, phone_number, role, is_active`,
    [d.name, d.role, d.isActive, d.phoneNumber || null, userId]
  );
  if (!result.rowCount) return res.status(404).json({ message: 'User not found' });
  return res.json(result.rows[0]);
};

export const updateStudentHandler = async (req: Request, res: Response) => {
  const studentId = String(req.params.studentId || '');
  if (!studentId) return res.status(400).json({ message: 'studentId is required' });
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const d = parsed.data;

  const currentEnrollment = await pool.query(
    `SELECT group_id, school_year_id
     FROM student_enrollments
     WHERE id = $1 AND student_id = $2
     LIMIT 1`,
    [d.enrollmentId, studentId]
  );
  if (!currentEnrollment.rowCount) {
    return res.status(404).json({ message: 'Enrollment not found' });
  }

  const current = currentEnrollment.rows[0];
  const mappingChanged = current.group_id !== d.groupId || current.school_year_id !== d.schoolYearId;
  if (mappingChanged) {
    const allowed = await pool.query(
      `SELECT 1 FROM group_school_years WHERE group_id = $1 AND school_year_id = $2 LIMIT 1`,
      [d.groupId, d.schoolYearId]
    );
    if (!allowed.rowCount) {
      return res.status(400).json({ message: 'Selected school year is not mapped to selected group' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE students
       SET full_name = $1,
           date_of_birth = $2,
           father_name = $3,
           mother_name = $4,
           mobile_number = $5,
           email = $6,
           current_address = $7,
           hobbies_or_interests = $8,
           medical_needs_or_allergies = $9
       WHERE id = $10`,
      [
        d.fullName,
        d.dateOfBirth || null,
        d.fatherName || null,
        d.motherName || null,
        d.mobileNumber || null,
        d.email || null,
        d.currentAddress || null,
        d.hobbiesOrInterests || null,
        d.medicalNeedsOrAllergies || null,
        studentId
      ]
    );

    await client.query(
      `UPDATE student_enrollments
       SET group_id = $1,
           school_year_id = $2,
           status = COALESCE($3, status)
       WHERE id = $4 AND student_id = $5`,
      [d.groupId, d.schoolYearId, d.status || null, d.enrollmentId, studentId]
    );
    await client.query('COMMIT');
    return res.json({ message: 'Student updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const archiveStudentEnrollmentHandler = async (req: Request, res: Response) => {
  const enrollmentId = String(req.params.enrollmentId || '');
  if (!enrollmentId) return res.status(400).json({ message: 'enrollmentId is required' });
  const result = await pool.query(
    `UPDATE student_enrollments
     SET status = 'archived'
     WHERE id = $1
     RETURNING id`,
    [enrollmentId]
  );
  if (!result.rowCount) return res.status(404).json({ message: 'Enrollment not found' });
  return res.json({ message: 'Student archived' });
};

export const deleteStudentHandler = async (req: Request, res: Response) => {
  const studentId = String(req.params.studentId || '');
  if (!studentId) return res.status(400).json({ message: 'studentId is required' });
  await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
  return res.status(204).send();
};
