import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const listSchoolYearsHandler = async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT id, name, sort_order FROM school_years ORDER BY sort_order');
  return res.json(result.rows);
};
