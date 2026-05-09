import nodemailer from "nodemailer";
import { logger } from "../Logger/LoggerService";

const smtpHost = Bun.env.SMTP_HOST;
const smtpPort = Number(Bun.env.SMTP_PORT ?? 587);
const smtpSecure = Bun.env.SMTP_SECURE === "true";
const smtpUser = Bun.env.SMTP_USER;
const smtpPass = Bun.env.SMTP_PASS;
const mailFrom = Bun.env.MAIL_FROM;

if (!smtpHost) {
  throw new Error("Missing SMTP_HOST");
}

if (!smtpUser) {
  throw new Error("Missing SMTP_USER");
}

if (!smtpPass) {
  throw new Error("Missing SMTP_PASS");
}

if (!mailFrom) {
  throw new Error("Missing MAIL_FROM");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export class MailService {
  public static async verifyConnection() {
    try {
      await transporter.verify();
      logger.info("SMTP connection is live!");
    } catch (error) {
      logger.error(`SMTP connection failed! ${error}`)
    }
  }

  public static async send(options: SendMailOptions) {
    const info = await transporter.sendMail({
      from: mailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info(`Email sent: ${info.messageId}`);

    return info;
  }

  public static async sendPasswordResetEmail(email: string, resetUrl: string) {
    return this.send({
      to: email,
      subject: "Reset your CodeBox password",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    });
  }
}