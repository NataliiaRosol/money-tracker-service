import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

// without SMTP credentials (local dev) emails are printed to the console
const transporter =
    env.SMTP_USER && env.SMTP_PASS
        ? nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465, // 465 = TLS from the start, 587 = STARTTLS
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        })
        : null;

type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput) {
    if (!transporter) {
        console.log(`[email] to: ${to}\nsubject: ${subject}\n${html}`);
        return;
    }

    // unlike Resend, nodemailer throws on failure
    try {
        await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    } catch (err) {
        console.error('SMTP error:', err);
        throw AppError.serviceUnavailable('Failed to send email');
    }
}
