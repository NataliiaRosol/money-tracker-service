import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function cleanupExpired() {
    const now = new Date();

    const tokens = await prisma.emailVerificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
    });

    const sessions = await prisma.session.deleteMany({
        where: {
            OR: [
                { revokedAt: { not: null } },
                { expiresAt: { lt: now } },
                { createdAt: { lt: new Date(now.getTime() - env.SESSION_MAX_DAYS * DAY_MS) } },
            ],
        },
    });

    console.log(`[cleanup] removed ${tokens.count} verification tokens, ${sessions.count} sessions`);
}
