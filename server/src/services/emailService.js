import nodemailer from "nodemailer";

/** @type {import("nodemailer").Transporter | null} */
let transporter = null;

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const tlsInsecure = process.env.SMTP_TLS_INSECURE === "true";

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
    ...(tlsInsecure ? { tls: { rejectUnauthorized: false } } : {}),
  });

  return transporter;
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} mail
 */
export async function sendEmail(mail) {
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, code: "NOT_CONFIGURED" };
  }

  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER.trim();
  const info = await transport.sendMail({
    from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  return { ok: true, messageId: info.messageId };
}
