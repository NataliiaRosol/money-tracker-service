import { AppError } from '../../errors/AppError.js';
import type { Session, User } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { DEFAULT_CATEGORIES } from '../categories/category.defaults.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { hashPassword, verifyPassword } from './password.js';
import {
    generateRefreshToken,
    hashRefreshToken,
    refreshExpiresAt,
    sessionMaxAgeExceeded,
    signAccess,
} from './tokens.js';

export type SessionMeta = {
    userAgent: string | undefined;
    ip: string | undefined;
};

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_REFRESH = 'Invalid or expired refresh token';

// якщо вже обміняний refresh token прийшов протягом цього часу після ротації —
// це паралельний запит того самого клієнта, а не крадіжка
const REUSE_GRACE_MS = 10_000;

function toPublicUser(user: User) {
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
}

async function createSession(userId: string, meta: SessionMeta) {
    // прибираємо мертві сесії юзера — їхня історія токенів видаляється каскадно
    await prisma.session.deleteMany({
        where: {
            userId,
            OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
        },
    });

    const refreshToken = generateRefreshToken();

    const session = await prisma.session.create({
        data: {
            userId,
            tokenHash: hashRefreshToken(refreshToken),   // у БД — тільки хеш
            expiresAt: refreshExpiresAt(),
            userAgent: meta.userAgent ?? null,
            ip: meta.ip ?? null,
        },
    });

    const accessToken = await signAccess(userId, session.id);
    return { accessToken, refreshToken };
}

export async function register(data: RegisterInput, meta: SessionMeta) {
    // якщо два запити прийдуть одночасно, другий впаде на unique email (P2002) → errorHandler віддасть 409
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw AppError.conflict('User with this email already exists');

    const user = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name ?? null,
            passwordHash: await hashPassword(data.password),
            categories: { createMany: { data: DEFAULT_CATEGORIES } },
        },
    });

    const tokens = await createSession(user.id, meta);
    return { user: toPublicUser(user), ...tokens };
}

export async function login(data: LoginInput, meta: SessionMeta) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // однакова помилка для "немає юзера" і "неправильний пароль",
    // щоб не можна було перевірити, чи зареєстрований email.
    // passwordHash === null — юзер зареєструвався через Google, пароля в нього немає
    if (!user || !user.passwordHash) throw AppError.unauthorized(INVALID_CREDENTIALS);

    const isValid = await verifyPassword(user.passwordHash, data.password);
    if (!isValid) throw AppError.unauthorized(INVALID_CREDENTIALS);

    // перевіряємо після пароля, щоб без пароля не можна було дізнатись, що акаунт заблокований
    if (user.isBlocked) throw AppError.forbidden('User is blocked');

    const tokens = await createSession(user.id, meta);
    return { user: toPublicUser(user), ...tokens };
}

export async function getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // requireAuth уже перевірив сесію, але юзера могли видалити між цими запитами
    if (!user) throw AppError.notFound('User not found');

    return toPublicUser(user);
}

type SessionWithUser = Pick<Session, 'revokedAt' | 'expiresAt' | 'createdAt'> & { user: { isBlocked: boolean } };

export function isSessionActive(session: SessionWithUser) {
    return !session.revokedAt
        && session.expiresAt > new Date()
        && !sessionMaxAgeExceeded(session.createdAt)
        && !session.user.isBlocked;
}

// токен не поточний: його вже обміняли на новий або його взагалі не існувало
async function handleUsedToken(tokenHash: string) {
    const used = await prisma.usedRefreshToken.findUnique({
        where: { tokenHash },
        include: { session: { include: { user: { select: { isBlocked: true } } } } },
    });
    if (!used) throw AppError.unauthorized(INVALID_REFRESH);

    const { session } = used;

    // токен обміняли щойно — це паралельний запит того самого клієнта (дві вкладки,
    // кілька запитів одразу), а не крадіжка. Новий refresh token клієнт отримає в cookie
    // з відповіді першого запиту, тому тут видаємо тільки access token, а cookie не чіпаємо
    if (Date.now() - used.usedAt.getTime() < REUSE_GRACE_MS) {
        if (!isSessionActive(session)) throw AppError.unauthorized(INVALID_REFRESH);

        const accessToken = await signAccess(session.userId, session.id);
        return { accessToken, refreshToken: null };
    }

    // старий токен прийшов пізніше — значить, його копія є ще в когось (можлива крадіжка).
    // Відкликаємо сесію: і зловмисник, і справжній юзер мусять залогінитись заново
    await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized(INVALID_REFRESH);
}

// refreshToken: null — новий refresh token не видавали, cookie чіпати не треба
export async function refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AppError.unauthorized(INVALID_REFRESH);

    const tokenHash = hashRefreshToken(refreshToken);
    const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: { select: { isBlocked: true } } },
    });

    if (!session) return handleUsedToken(tokenHash);
    if (!isSessionActive(session)) throw AppError.unauthorized(INVALID_REFRESH);

    // ротація: видаємо новий токен, а старий записуємо в історію.
    // Транзакція — щоб не вийшло, що токен змінився, а старий в історію не потрапив
    const newRefreshToken = generateRefreshToken();
    const now = new Date();
    const rotated = await prisma.$transaction(async (tx) => {
        // tokenHash у where — захист від гонки: якщо паралельний запит уже зробив ротацію, тут нічого не оновиться
        const { count } = await tx.session.updateMany({
            where: { id: session.id, tokenHash, revokedAt: null },
            data: {
                tokenHash: hashRefreshToken(newRefreshToken),
                expiresAt: refreshExpiresAt(),
                lastUsedAt: now,
            },
        });
        if (count === 0) return false;

        await tx.usedRefreshToken.create({ data: { tokenHash, sessionId: session.id, usedAt: now } });
        return true;
    });

    // паралельний запит уже обміняв цей токен — тепер він в історії, обробляємо як старий
    if (!rotated) return handleUsedToken(tokenHash);

    const accessToken = await signAccess(session.userId, session.id);
    return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string | undefined) {
    // немає токена або сесію вже відкликано — нічого не робимо, logout завжди "успішний"
    if (!refreshToken) return;

    await prisma.session.updateMany({
        where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
