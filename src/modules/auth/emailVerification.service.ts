import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { sendEmail } from '../../lib/mailer.js';
import { prisma } from '../../lib/prisma.js';
import { verificationEmailHtml } from './emailVerification.template.js';
import { generateToken, hashToken } from './tokens.js';

// used both for expiresAt and in the email text, so they can't drift apart
const VERIFICATION_TTL_HOURS = 24;
const INVALID_LINK = 'Invalid or expired verification link';

type UserToVerify = { id: string; email: string };

export async function sendVerificationEmail(user: UserToVerify) {
    const token = generateToken();

    // only the latest link works: sending a new one invalidates the previous ones.
    // This also keeps at most one token per user, so old ones don't pile up
    await prisma.$transaction([
        prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
        prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(token), // only the hash goes to the DB
                email: user.email,
                expiresAt: new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
            },
        }),
    ]);

    // the link opens a frontend page, which then POSTs the token: mail scanners open GET links
    // from emails on their own, and a direct API link would get verified/burned without the user
    const link = new URL('/verify-email', env.FRONTEND_DOMAIN);
    link.searchParams.set('token', token);

    await sendEmail({
        to: user.email,
        subject: 'Підтвердіть email — Money Tracker',
        html: verificationEmailHtml(link.toString(), VERIFICATION_TTL_HOURS),
    });
}

// for register / email change: the user is already saved, so a mail provider outage
// must not fail the whole request — the user can press "resend" later
export async function trySendVerificationEmail(user: UserToVerify) {
    try {
        await sendVerificationEmail(user);
    } catch (err) {
        console.error('Failed to send verification email:', err);
    }
}

export async function verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: { select: { email: true } } },
    });

    // one error for every case, so the response doesn't reveal what exactly is wrong.
    // Email mismatch — the user changed email after this link was sent: the new address isn't confirmed by it
    if (!record || record.expiresAt < new Date() || record.email !== record.user.email) {
        throw AppError.badRequest(INVALID_LINK);
    }

    await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
        // the link is single-use
        prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
    ]);
}

export async function resendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, emailVerifiedAt: true },
    });
    // requireAuth already checked the session, but the user could be deleted in between
    if (!user) throw AppError.notFound('User not found');
    if (user.emailVerifiedAt) throw AppError.badRequest('Email is already verified');

    await sendVerificationEmail(user);
}
