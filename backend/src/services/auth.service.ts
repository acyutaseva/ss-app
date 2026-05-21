import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

import { sendTemplatedEmail } from './email.service.js';

const passwordResetExpiresIn = (process.env.PASSWORD_RESET_EXPIRES_IN || '30m') as jwt.SignOptions['expiresIn'];
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

type PasswordResetPayload = {
  sub: string;
  type: 'password-reset';
};

export const createPasswordResetUrl = (userId: string, passwordHash: string) => {
  const token = jwt.sign(
    { sub: userId, type: 'password-reset' } satisfies PasswordResetPayload,
    `${env.jwtSecret}:${passwordHash}`,
    { expiresIn: passwordResetExpiresIn }
  );
  return `${frontendUrl}/login?resetToken=${encodeURIComponent(token)}`;
};

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

  // Do not block login response on external email provider latency.
  const loginTime = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Perth' });
  void sendTemplatedEmail({
    to: process.env.LOGIN_NOTIFICATION_EMAIL || 'abhishekchouhan@gmail.com',
    subject: 'Sunday School - User Login Notification',
    template: 'loginNotification',
    context: {
      userName: user.name,
      userEmail: user.email,
      role: user.role,
      loginTime
    }
  }).catch((e) => {
    console.error('Failed to send login notification email:', e);
  });

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

export const requestPasswordReset = async (email: string) => {
  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1 AND is_active = true LIMIT 1',
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    return;
  }

  const resetUrl = createPasswordResetUrl(user.id, user.password_hash);

  await sendTemplatedEmail({
    to: user.email,
    subject: 'Sunday School - Reset your password',
    template: 'passwordReset',
    context: {
      resetUrl,
      expiresIn: String(passwordResetExpiresIn)
    }
  });
};

export const resetPassword = async (token: string, newPassword: string) => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid or expired reset token');
  }

  const userId = decoded.sub;
  const result = await pool.query(
    'SELECT id, password_hash FROM users WHERE id = $1 AND is_active = true LIMIT 1',
    [userId]
  );
  const user = result.rows[0];
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  let verified: string | jwt.JwtPayload;
  try {
    verified = jwt.verify(token, `${env.jwtSecret}:${user.password_hash}`);
  } catch {
    throw new Error('Invalid or expired reset token');
  }

  if (typeof verified !== 'object' || verified.type !== 'password-reset') {
    throw new Error('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
};
