import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendEmail({ to, subject, text }) {
  if (!transporter) {
    console.log(`[mail:dev] to=${to} | ${subject} | ${text}`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}
