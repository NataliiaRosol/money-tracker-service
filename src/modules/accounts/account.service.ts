import { AppError } from "../../errors/AppError.js";
import { Prisma, type CategoryType } from "../../generated/prisma/browser.js";
import { convert, getExchangeRates } from "../../lib/currency.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateAccountInput, ListAccountsQuery, UpdateAccountInput } from "./account.schema.js";

async function sumByAccount(accountIds: string[], type: CategoryType, range: { from?: Date; to?: Date } = {}) {
    const rows = await prisma.transaction.groupBy({
        by: ['accountId'],
        where: {
            accountId: { in: accountIds },
            category: { type },
            date: {
                ...(range.from && { gte: range.from }),
                ...(range.to && { lt: range.to }),
            },
        },
        _sum: { amount: true },
    })

    return new Map(rows.map((r) => [r.accountId, r._sum?.amount ?? new Prisma.Decimal(0)]));
}


export async function getAccounts(userId: string, query: ListAccountsQuery) {
    const accounts = await prisma.account.findMany({
        where: {
            ownerId: userId,
            ...(query.type && { type: query.type }),
            ...(query.includeArchived === false && { archived: false }),
        },
        orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    });

    const accountIds = accounts.map((a) => a.id);
    const [incomeSums, expenseSums] = await Promise.all([
        sumByAccount(accountIds, 'INCOME'),
        sumByAccount(accountIds, 'EXPENSE'),
    ])

    const zero = new Prisma.Decimal(0);

    return accounts.map((account) => {
        const totalIncome = incomeSums.get(account.id) ?? zero;
        const totalExpense = expenseSums.get(account.id) ?? zero;
        const isMine = account.ownerId === userId;
        return {
            ...account,
            balance: account.initialBalance.plus(totalIncome).minus(totalExpense),
            isMine
        };
    });
}

// Total of all included accounts converted to the user's base currency by NBU rates
export async function getTotalBalance(userId: string) {
    const [user, accounts, rates] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } }),
        getAccounts(userId, { includeArchived: false }),
        getExchangeRates(),
    ]);

    // sum per currency first, so each currency is converted once
    const zero = new Prisma.Decimal(0);
    const sums = new Map<string, typeof zero>();
    for (const account of accounts) {
        if (!account.includeInTotal) continue;
        const current = sums.get(account.currency) ?? zero;
        sums.set(account.currency, current.plus(account.balance));
    }

    const byCurrency = Array.from(sums, ([currency, balance]) => ({ currency, balance }));
    const total = byCurrency.reduce(
        (acc, { currency, balance }) => acc.plus(convert(balance, currency, user.baseCurrency, rates)),
        zero,
    );

    return {
        currency: user.baseCurrency,
        total: total.toDecimalPlaces(2),
        byCurrency,
        ratesDate: rates.date,
    };
}

export async function getAccountById(userId: string, accountId: string) {
    const account = await prisma.account.findUnique({
        where: {
            id: accountId,
            ownerId: userId,
        }
    });

    if (!account) {
        throw AppError.notFound("Account not found");
    }

    // transaction.date is @db.Date (stored as UTC midnight), so month boundaries are in UTC too
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const accountIds = [account.id];
    const [incomeSums, expenseSums, monthIncomeSums, monthExpenseSums] = await Promise.all([
        sumByAccount(accountIds, 'INCOME'),
        sumByAccount(accountIds, 'EXPENSE'),
        sumByAccount(accountIds, 'INCOME', { from: monthStart, to: nextMonthStart }),
        sumByAccount(accountIds, 'EXPENSE', { from: monthStart, to: nextMonthStart }),
    ])

    const zero = new Prisma.Decimal(0);
    const totalIncome = incomeSums.get(account.id) ?? zero;
    const totalExpense = expenseSums.get(account.id) ?? zero;

    return {
        ...account,
        balance: account.initialBalance.plus(totalIncome).minus(totalExpense),
        isMine: account.ownerId === userId,
        monthIncome: monthIncomeSums.get(account.id) ?? zero,
        monthExpense: monthExpenseSums.get(account.id) ?? zero,
    };
}

export async function createAccount(userId: string, data: CreateAccountInput) {
    const existing = await prisma.account.findFirst({
        where: {
            ownerId: userId,
            name: { equals: data.name, mode: 'insensitive' },
        }
    });

    if (existing) {
        throw AppError.conflict("Account with this name already exists");
    }

    const account = await prisma.account.create({
        data: {
            ownerId: userId,
            name: data.name,
            currency: data.currency,
            ...(data.type && { type: data.type }),
            ...(data.initialBalance && { initialBalance: data.initialBalance }),
            icon: data.icon ?? null,
            color: data.color ?? null,
            includeInTotal: data.includeInTotal ?? data.type !== 'SAVINGS',
        }
    });

    return { ...account, balance: account.initialBalance };
}

export async function updateAccount(userId: string, accountId: string, data: UpdateAccountInput) {
    const account = await prisma.account.findFirst({
        where: { id: accountId, ownerId: userId },
    });
    if (!account) throw AppError.notFound('Account not found');

    if (data.name !== undefined) {
        const duplicate = await prisma.account.findFirst({
            where: {
                ownerId: userId,
                name: { equals: data.name, mode: 'insensitive' },
                id: { not: accountId },
            },
        });
        if (duplicate) throw AppError.conflict('Account with this name already exists');
    }

    await prisma.account.update({
        where: { id: accountId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.type !== undefined && { type: data.type }),
            ...(data.initialBalance !== undefined && { initialBalance: data.initialBalance }),
            ...(data.icon !== undefined && { icon: data.icon }),
            ...(data.color !== undefined && { color: data.color }),
            ...(data.archived !== undefined && { archived: data.archived }),
            ...(data.includeInTotal !== undefined && { includeInTotal: data.includeInTotal }),
        },
    });

    return getAccountById(userId, accountId);
}


export async function deleteAccount(userId: string, accountId: string) {
    const { count } = await prisma.account.deleteMany({
        where: { id: accountId, ownerId: userId },
    });
    if (count === 0) throw AppError.notFound('Account not found');
}
