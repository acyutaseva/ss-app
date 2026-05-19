import { Request, Response } from 'express';
import { z } from 'zod';
import { login } from '../services/auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginHandler = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json(result);
};
