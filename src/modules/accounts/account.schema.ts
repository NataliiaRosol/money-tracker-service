import { z } from 'zod';
import { AccountType } from '../../generated/prisma/enums.js';

const name = z.string().trim().min(1, 'Name is required').max(50, 'Max 50 characters');
const currency = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be in #RRGGBB format');

// Decimal(19, 4): up to 15 integer digits and 4 fractional digits.
// Accepts a number or a string, returns a string so Prisma stores it without float rounding.
const amount = z
    .union([z.string().trim(), z.number()])
    .transform(String)
    .pipe(z.string().regex(/^-?\d{1,15}(\.\d{1,4})?$/, 'Invalid amount: max 15 digits before and 4 after the decimal point'));

// POST /accounts — body
export const createAccountSchema = z.object({
    name,
    type: z.enum(AccountType).optional(),
    currency,
    initialBalance: amount.optional(),
    color: color.optional(),
});

// PATCH /accounts/:id — body
// currency is not editable: existing transactions are already in this currency
export const updateAccountSchema = z
    .object({
        name: name.optional(),
        type: z.enum(AccountType).optional(),
        initialBalance: amount.optional(),
        color: color.nullable().optional(),
        archived: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

// /accounts/:id — params
export const accountIdParamsSchema = z.object({
    id: z.uuid(),
});

// GET /accounts?type=CARD&includeArchived=true — query
export const listAccountsQuerySchema = z.object({
    type: z.enum(AccountType).optional(),
    includeArchived: z.stringbool().default(false),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
