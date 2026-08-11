import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Sends email via SMTP when configured. Without SMTP (e.g. before the operator
// sets SMTP_* env), it logs the message server-side so password-reset links can
// still be retrieved from the deploy logs, and returns `false`.
export async function sendEmail(args: SendArgs): Promise<boolean> {
  if (!env.smtp.host || !env.smtp.user) {
    console.log(
      `[email:not-configured] to=${args.to} subject="${args.subject}"\n${args.text}`,
    );
    return false;
  }
  try {
    const transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
    await transport.sendMail({
      from: env.smtp.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}
