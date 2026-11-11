import { z } from 'zod';
import { emailField, nameField, passwordField } from '../auth/auth.schemas.js';

// only compared with the stored hash, so no rules beyond the max length (same as login)
const currentPassword = z.string().min(1, 'Current password is required').max(128);

// PATCH /settings/profile — body. null clears the name
export const updateProfileSchema = z.object({
    name: nameField.nullable(),
});

// PATCH /settings/email — body
export const changeEmailSchema = z.object({
    email: emailField,
    currentPassword,
});

// PATCH /settings/password — body
export const changePasswordSchema = z
    .object({
        currentPassword,
        newPassword: passwordField,
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        message: 'New password must be different from the current one',
        path: ['newPassword'],
    });

// PATCH /settings/default-account — body. null removes the default
export const setDefaultAccountSchema = z.object({
    accountId: z.uuid().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SetDefaultAccountInput = z.infer<typeof setDefaultAccountSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
