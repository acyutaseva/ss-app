import { Resend } from 'resend';
import dotenv from 'dotenv';
import Handlebars from 'handlebars';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailTemplateName = 'testEmail';

const baseTemplate = Handlebars.compile(`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;background-color:#f5f7fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;padding:16px 24px;">
                <h1 style="margin:0;font-size:20px;line-height:1.2;color:#ffffff;">Hare Krishna Sunday School</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                {{{content}}}
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
    <h2 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f172a;">{{title}}</h2>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">{{message}}</p>
    <div style="margin-top:20px;padding:12px 14px;border-left:4px solid #0ea5e9;background:#f0f9ff;color:#0c4a6e;font-size:14px;line-height:1.5;">
      This message confirms your email integration is working with template rendering.
    </div>
  `)
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type SendTemplatedEmailInput = {
  to: string;
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
