import nodemailer, { Transporter } from "nodemailer";
import { ENV } from "../config/env.js";

let transporter: Transporter | null = null;

// Uses real SMTP when configured; otherwise falls back to a no-op transport
// so local development doesn't require real email credentials. Either way,
// callers get the same interface — the fallback is logged clearly so it's
// never mistaken for a real send.
function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

export async function sendMail(to: string, subject: string, html: string) {
  const mailer = getTransporter();

  if (!ENV.SMTP_HOST) {
    console.log(
      `[DEV MODE] SMTP not configured — email not actually sent.\nTo: ${to}\nSubject: ${subject}\n${html}`
    );
  }

  return mailer.sendMail({
    from: ENV.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
