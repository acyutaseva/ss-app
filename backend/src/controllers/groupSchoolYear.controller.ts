import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const assignGroupSchoolYearSchema = z.object({
  groupId: z.string().uuid(),
  schoolYearId: z.string().uuid()
});

export const assignGroupSchoolYearHandler = async (req: Request, res: Response) => {
  const parsed = assignGroupSchoolYearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });

  const d = parsed.data;
  await pool.query(
    `INSERT INTO group_school_years (group_id, school_year_id)
     VALUES ($1, $2)
     ON CONFLICT (group_id, school_year_id) DO NOTHING`,
    [d.groupId, d.schoolYearId]
  );

  return res.status(204).send();
};
