import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';
import { isSessionActive } from '../modules/auth/auth.service.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw AppError.unauthorized('Missing access token');

    const { userId, sessionId } = await verifyAccessToken(token);

    // JWT лишається валідним до кінця свого терміну навіть після logout чи блокування юзера,
    // тому перевіряємо, що сесія ще жива — інакше відкликання спрацювало б тільки через JWT_EXPIRES_IN
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: { select: { isBlocked: true } } },
    });
    if (!session || !isSessionActive(session)) throw AppError.unauthorized('Session expired or revoked');

    req.userId = userId;
    next();
};
