import { Resend } from 'resend';
import dotenv from 'dotenv';
import Handlebars from 'handlebars';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailTemplateName = 'testEmail' | 'loginNotification' | 'passwordReset' | 'volunteerWelcome';

const baseTemplate = Handlebars.compile(`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f7f3;font-family:Arial,sans-serif;color:#1f2b23;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;background-color:#f3f7f3;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #d7e3d6;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#2f5d45;padding:16px 24px;">
                <h1 style="margin:0;font-size:20px;line-height:1.2;color:#ffffff;">Hare Krishna Sunday School</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                {{{content}}}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px;background:#f2f7f1;border-top:1px solid #d7e3d6;color:#587162;font-size:12px;line-height:1.4;">
                Automated message from Hare Krishna Sunday School.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`);

const emailTemplates: Record<EmailTemplateName, ReturnType<typeof Handlebars.compile>> = {
  testEmail: Handlebars.compile(`
    <h2 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#1f2b23;">{{title}}</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a4d41;">{{message}}</p>
    <div style="margin-top:20px;padding:12px 14px;border-left:4px solid #5f8d63;background:#eef6ed;color:#2f5d45;font-size:14px;line-height:1.5;">
      This message confirms your email integration is working with template rendering.
    </div>
  `),
  loginNotification: Handlebars.compile(`
    <h2 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#1f2b23;">User Login Notification</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a4d41;">A user has logged in to Sunday School portal.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7e3d6;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;width:160px;">Name</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{userName}}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;">Email</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{userEmail}}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;">Role</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{role}}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;">Login Time</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{loginTime}}</td>
      </tr>
    </table>
  `),
  passwordReset: Handlebars.compile(`
    <h2 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#1f2b23;">Reset Your Password</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a4d41;">We received a request to reset your password for Sunday School portal.</p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a4d41;">Click the button below to set a new password. This link expires in {{expiresIn}}.</p>
    <p style="margin:18px 0 12px 0;">
      <a href="{{resetUrl}}" style="display:inline-block;background:#2f5d45;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:10px 16px;">Reset Password</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#587162;word-break:break-all;">If the button does not work, copy this link into your browser:<br />{{resetUrl}}</p>
  `),
  volunteerWelcome: Handlebars.compile(`
    <h2 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#1f2b23;">Volunteer Account Created</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a4d41;">A new volunteer account has been created in Sunday School portal.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7e3d6;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;width:160px;">Name</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{userName}}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;">Email</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{userEmail}}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;background:#f2f7f1;color:#587162;font-size:13px;">Role</td>
        <td style="padding:10px 12px;color:#1f2b23;font-size:14px;">{{role}}</td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#3a4d41;">Sign in here: <a href="{{loginUrl}}" style="color:#2f5d45;font-weight:700;">{{loginUrl}}</a></p>
    <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#3a4d41;">If this is your first login, use <strong>Forgot Password</strong> on the sign-in page to set your password.</p>
    <p style="margin:18px 0 12px 0;">
      <a href="{{resetUrl}}" style="display:inline-block;background:#2f5d45;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:10px 16px;">Set Your Password</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#587162;word-break:break-all;">Direct reset link:<br />{{resetUrl}}</p>
  `)
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendTemplatedEmailInput = {
  to: string | string[];
  subject: string;
  template: EmailTemplateName;
  context: Record<string, unknown>;
};

function renderEmailTemplate(template: EmailTemplateName, subject: string, context: Record<string, unknown>) {
  const contentTemplate = emailTemplates[template];
  const content = contentTemplate(context);
  return baseTemplate({ subject, content });
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
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

export async function sendTemplatedEmail({ to, subject, template, context }: SendTemplatedEmailInput) {
  const html = renderEmailTemplate(template, subject, context);
  return sendEmail({ to, subject, html });
}
