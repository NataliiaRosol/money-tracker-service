import { rateLimit, type Options } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// ліміт рахується по IP. Лічильники в пам'яті процесу: скидаються при рестарті
// і не спільні між кількома інстансами (для цього потрібен Redis store)
const baseOptions: Partial<Options> = {
    standardHeaders: 'draft-8',   // RateLimit-* заголовки, щоб клієнт бачив ліміт і коли він скинеться
    legacyHeaders: false,         // без старих X-RateLimit-*
    // віддаємо через errorHandler, щоб формат відповіді був як у всіх інших помилок
    handler: (_req, _res, next) => next(AppError.tooManyRequests('Too many attempts, try again later')),
};

// рахуються тільки невдалі спроби (статус >= 400) — юзер, який просто логіниться, ліміт не витрачає,
// а перебір паролів упирається в 10 помилок за 15 хвилин
export const loginLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * MINUTE,
    limit: 10,
    skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
    ...baseOptions,
    windowMs: HOUR,
    limit: 10,
});

export const passwordCheckLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * MINUTE,
    limit: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.userId,
});

// every successful request sends a real email: without a limit "resend" could flood an inbox
// and burn the Resend quota. Failed ones (already verified, provider down) sent nothing, so they don't count.
// Keyed by user, so requireAuth has to run before it
export const emailSendLimiter = rateLimit({
    ...baseOptions,
    windowMs: HOUR,
    limit: 3,
    skipFailedRequests: true,
    keyGenerator: (req) => req.userId,
});
