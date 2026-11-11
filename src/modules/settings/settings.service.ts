import { AppError } from '../../errors/AppError.js';
import type { User } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { toPublicUser } from '../auth/auth.service.js';
import { trySendVerificationEmail } from '../auth/emailVerification.service.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import type { ChangeEmailInput, ChangePasswordInput, SetDefaultAccountInput, UpdateProfileInput } from './settings.schema.js';

async function findUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // requireAuth already checked the session, but the user could be deleted in between
    if (!user) throw AppError.notFound('User not found');
    return user;
}

// re-auth for sensitive changes: an access token alone (e.g. from an unattended open tab)
// must not be enough to take over the account by changing its email or password
async function verifyCurrentPassword(user: User, password: string) {
    // passwordHash === null — signed up via Google, there is no password to check
    if (!user.passwordHash) throw AppError.badRequest('Password is not set for this account');

    const isValid = await verifyPassword(user.passwordHash, password);
    // 400, not 401: on 401 the client would think the access token expired and refresh / log out
    if (!isValid) throw new AppError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { name: data.name },
    });
    return toPublicUser(user);
}

export async function setDefaultAccount(userId: string, data: SetDefaultAccountInput) {
    if (data.accountId !== null) {
        // the FK only checks that the account exists, not whose it is
        const account = await prisma.account.findFirst({
            where: { id: data.accountId, ownerId: userId },
            select: { archived: true },
        });
        if (!account) throw AppError.notFound('Account not found');
        // transactions can't be added to an archived account, so it's useless as a default
        if (account.archived) throw AppError.badRequest('An archived account cannot be the default');
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: { defaultAccountId: data.accountId },
    });
    return toPublicUser(user);
}

export async function changeEmail(userId: string, data: ChangeEmailInput) {
    const user = await findUser(userId);
    // password goes first, so without it you can't probe which emails are registered
    await verifyCurrentPassword(user, data.currentPassword);

    if (data.email === user.email) return toPublicUser(user);

    // two simultaneous requests: the second one fails on unique email (P2002) → errorHandler returns 409
    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) throw AppError.conflict('User with this email already exists');

    const updated = await prisma.user.update({
        where: { id: userId },
        // the new address hasn't been confirmed
        data: { email: data.email, emailVerifiedAt: null },
    });

    // also invalidates links sent to the old address
    await trySendVerificationEmail(updated);

    return toPublicUser(updated);
}

export async function changePassword(userId: string, sessionId: string, data: ChangePasswordInput) {
    const user = await findUser(userId);
    await verifyCurrentPassword(user, data.currentPassword);

    const passwordHash = await hashPassword(data.newPassword);

    // log out every other device: if the password is changed because it leaked, whoever used it
    // loses access right away (requireAuth checks the session on every request).
    // The current session stays, so the user isn't logged out of the tab they're in
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
        prisma.session.updateMany({
            where: { userId, id: { not: sessionId }, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
    ]);
}
