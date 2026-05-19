import { Request, Response } from 'express';
import { z } from 'zod';
import { login } from '../services/auth.service.js';

import { sendTemplatedEmail } from '../services/email.service.js';

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

// Example: Send a test email
export const sendTestEmailHandler = async (req: Request, res: Response) => {
  const { to } = req.body;
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid "to" field' });
  }
  try {
    await sendTemplatedEmail({
      to,
      subject: 'Test Email from Resend',
      template: 'testEmail',
      context: {
        title: 'This is a test email sent via Resend',
        message: 'Your backend is now using a template engine for cleaner, reusable email formatting.'
      }
    });
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email', error: err?.toString() });
  }
};
