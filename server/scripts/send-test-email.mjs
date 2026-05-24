/**
 * Send one test email via SMTP to verify configuration.
 *
 * Setup:
 *   1. npm install --prefix server
 *   2. Add SMTP_* and TEST_EMAIL_TO to server/.env (see server/.env.example)
 *   3. npm run email:test --prefix server
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in server/.env (see server/.env.example).`);
    process.exit(1);
  }
  return value;
}

const host = required("SMTP_HOST");
const port = Number(process.env.SMTP_PORT || "587");
const user = required("SMTP_USER");
const pass = required("SMTP_PASS");
const to = required("TEST_EMAIL_TO");
const from = process.env.SMTP_FROM?.trim() || user;
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const tlsInsecure = process.env.SMTP_TLS_INSECURE === "true";

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(tlsInsecure ? { tls: { rejectUnauthorized: false } } : {}),
});

if (tlsInsecure) {
  console.warn("SMTP_TLS_INSECURE=true — TLS certificate verification disabled (local test only).");
}

try {
  await transporter.verify();
  console.log("SMTP connection OK");

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Booking System — test email",
    text: `SMTP is working.\n\nSent at: ${new Date().toISOString()}\nFrom: ${from}\nTo: ${to}`,
  });

  console.log(`Test email sent to ${to}`);
  console.log(`Message ID: ${info.messageId}`);
} catch (err) {
  console.error("Failed to send test email:", err.message);
  process.exit(1);
}
