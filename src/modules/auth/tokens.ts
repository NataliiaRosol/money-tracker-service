import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import type { Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const accessTtl = env.JWT_EXPIRES_IN;
const refreshTtlMs = env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const sessionMaxAgeMs = env.SESSION_MAX_DAYS * 24 * 60 * 60 * 1000;

const ISSUER = 'money-tracker-api';
const AUDIENCE = 'money-tracker-web';
export const REFRESH_COOKIE = 'refresh_token';

function sha256(s: string) {
    return crypto.createHash('sha256').update(s).digest('hex');
}

export function signAccess(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(accessTtl)
        .sign(secret);
}


export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE });

        if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
            throw new Error('Malformed token payload');
        }

        return { userId: payload.sub, sessionId: payload.sid };
    } catch {
        throw AppError.unauthorized('Invalid or expired access token');
    }
};

export function generateRefreshToken() {
    return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string) {
    return sha256(token);
}

export function refreshExpiresAt() {
    return new Date(Date.now() + refreshTtlMs);
}

// абсолютний ліміт: ротація щоразу посуває expiresAt, але сесія не живе довше за SESSION_MAX_DAYS від створення
export function sessionMaxAgeExceeded(createdAt: Date) {
    return createdAt.getTime() + sessionMaxAgeMs < Date.now();
}


const refreshCookieOptions = {
    httpOnly: true,
    secure: env.BACKEND_DOMAIN.startsWith('https://'),
    sameSite: 'strict',      // якщо фронт на іншому домені — 'none' + CORS credentials
    path: '/api/auth',       // cookie йде тільки на auth-ендпоінти
} as const;

export function setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions, maxAge: refreshTtlMs });
}

export function clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
}
