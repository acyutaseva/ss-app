import { Request, Response } from 'express';
import { pool } from '../db/pool.js';

export const listGroupsHandler = async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT
      g.id,
      g.name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', sy.id,
            'name', sy.name,
            'sortOrder', sy.sort_order
          )
          ORDER BY sy.sort_order
        ) FILTER (WHERE sy.id IS NOT NULL),
        '[]'::json
      ) AS school_years
     FROM groups g
     LEFT JOIN group_school_years gsy ON gsy.group_id = g.id
     LEFT JOIN school_years sy ON sy.id = gsy.school_year_id
     GROUP BY g.id
     ORDER BY g.name`
  );
  return res.json(result.rows);
};
