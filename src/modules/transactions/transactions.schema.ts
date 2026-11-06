import { z } from 'zod';
import { CategoryType } from '../../generated/prisma/enums.js';

// Decimal(19, 4): up to 15 integer digits and 4 fractional digits.
// Accepts a number or a string, returns a string so Prisma stores it without float rounding.
const decimal = z
    .union([z.string().trim(), z.number()])
    .transform(String)
    .pipe(z.string().regex(/^\d{1,15}(\.\d{1,4})?$/, 'Invalid amount: max 15 digits before and 4 after the decimal point'));

// Always positive: income/expense is defined by the category type, not by the sign.
const amount = decimal.refine((value) => Number(value) > 0, 'Amount must be greater than 0');

// ?accountIds=a,b or ?accountIds=a&accountIds=b → ['a', 'b']; an empty value means no filter
const uuidList = z
    .union([z.string(), z.array(z.string())])
    .transform((value) => [value].flat().flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.uuid()))
    .transform((list) => (list.length > 0 ? list : undefined));

// date is @db.Date: accept "YYYY-MM-DD" only, new Date() parses it as UTC midnight
const date = z.iso.date('Date must be in YYYY-MM-DD format').transform((value) => new Date(value));

const description = z.string().trim().max(255, 'Max 255 characters');

// POST /transactions — body
export const createTransactionSchema = z.object({
    accountId: z.uuid(),
    categoryId: z.uuid(),
    amount,
    date,
    description: description.optional(),
});

// PATCH /transactions/:id — body
export const updateTransactionSchema = z
    .object({
        accountId: z.uuid().optional(),
        categoryId: z.uuid().optional(),
        amount: amount.optional(),
        date: date.optional(),
        description: description.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

// /transactions/:id — params
export const transactionIdParamsSchema = z.object({
    id: z.uuid(),
});

// GET /transactions?accountIds=a,b&categoryIds=c&type=EXPENSE&from=2026-11-01&to=2026-11-30
//     &search=coffee&minAmount=100&maxAmount=500&page=1&limit=20 — query
// all ranges are inclusive
export const listTransactionsQuerySchema = z
    .object({
        accountIds: uuidList.optional(),
        categoryIds: uuidList.optional(),
        // only two types, so "both" is the same as no filter
        type: z.enum(CategoryType).optional(),
        from: date.optional(),
        to: date.optional(),
        search: z.string().trim().max(100, 'Max 100 characters').optional(),
        minAmount: decimal.optional(),
        maxAmount: decimal.optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .refine((data) => !data.from || !data.to || data.from <= data.to, {
        message: '"from" must be before or equal to "to"',
        path: ['to'],
    })
    .refine((data) => !data.minAmount || !data.maxAmount || Number(data.minAmount) <= Number(data.maxAmount), {
        message: '"minAmount" must be less than or equal to "maxAmount"',
        path: ['maxAmount'],
    });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
