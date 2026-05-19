import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

import { sendEmail } from './email.service.js';

export const login = async (email: string, password: string) => {
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1 AND is_active = true LIMIT 1',
    [email]
  );

  const user = result.rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const token = jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    env.jwtSecret,
    { expiresIn: '12h' }
  );

  // Send email to abhishekchouhan@gmail.com on every login
  try {
    await sendEmail({
      to: 'abhishekchouhan@gmail.com',
      subject: 'Sunday School - User Login Notification',
      html: `<p>User <strong>${user.name}</strong> (${user.email}) just logged in at ${new Date().toLocaleString()}.</p>`
    });
  } catch (e) {
    console.error('Failed to send login notification email:', e);
  }

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};
