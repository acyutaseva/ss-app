import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'no-reply@example.com',
      to,
      subject,
      html,
    });
    if (error) {
      throw error;
    }
    return data;
  } catch (err) {
    console.error('Email send error:', err);
    throw err;
  }
}
