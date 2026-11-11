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

// transaction.date is @db.Date (stored as UTC midnight), so month boundaries are in UTC too
function currentMonthRange() {
    const now = new Date();
    return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    };
}

type Decimal = InstanceType<typeof Prisma.Decimal>;

// Loads all-time balance and this month's income/expense for the given accounts.
// Returns a lookup, so every caller (list, single account, total) counts them the same way.
async function getAccountTotals(accountIds: string[]) {
    const month = currentMonthRange();
    const [incomeSums, expenseSums, monthIncomeSums, monthExpenseSums] = await Promise.all([
        sumByAccount(accountIds, 'INCOME'),
        sumByAccount(accountIds, 'EXPENSE'),
        sumByAccount(accountIds, 'INCOME', month),
        sumByAccount(accountIds, 'EXPENSE', month),
    ]);

    const zero = new Prisma.Decimal(0);
    return (account: { id: string; initialBalance: Decimal }) => ({
        balance: account.initialBalance
            .plus(incomeSums.get(account.id) ?? zero)
            .minus(expenseSums.get(account.id) ?? zero),
        monthIncome: monthIncomeSums.get(account.id) ?? zero,
        monthExpense: monthExpenseSums.get(account.id) ?? zero,
    });
}

async function getDefaultAccountId(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultAccountId: true } });
    return user?.defaultAccountId ?? null;
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

    const [totalsOf, defaultAccountId] = await Promise.all([
        getAccountTotals(accounts.map((a) => a.id)),
        getDefaultAccountId(userId),
    ]);

    return accounts.map((account) => ({
        ...account,
        ...totalsOf(account),
        isMine: account.ownerId === userId,
        isDefault: account.id === defaultAccountId,
    }));
}

// Balance and this month's income/expense of all included accounts,
// converted to the user's base currency by NBU rates
export async function getTotalBalance(userId: string) {
    const [user, accounts, rates] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } }),
        // archived and "not in total" accounts are filtered out here, so their transactions aren't summed at all
        prisma.account.findMany({
            where: { ownerId: userId, archived: false, includeInTotal: true },
            select: { id: true, currency: true, initialBalance: true },
        }),
        getExchangeRates(),
    ]);

    const totalsOf = await getAccountTotals(accounts.map((a) => a.id));

    const zero = new Prisma.Decimal(0);
    type Totals = { balance: Decimal; monthIncome: Decimal; monthExpense: Decimal };
    const emptyTotals: Totals = { balance: zero, monthIncome: zero, monthExpense: zero };

    // sum per currency first, so each currency is converted once
    const sums = new Map<string, Totals>();
    for (const account of accounts) {
        const current = sums.get(account.currency) ?? emptyTotals;
        const { balance, monthIncome, monthExpense } = totalsOf(account);
        sums.set(account.currency, {
            balance: current.balance.plus(balance),
            monthIncome: current.monthIncome.plus(monthIncome),
            monthExpense: current.monthExpense.plus(monthExpense),
        });
    }

    const byCurrency = Array.from(sums, ([currency, totals]) => ({ currency, ...totals }));

    const toBase = (amount: Decimal, currency: string) => convert(amount, currency, user.baseCurrency, rates);
    const total = byCurrency.reduce<Totals>(
        (acc, { currency, balance, monthIncome, monthExpense }) => ({
            balance: acc.balance.plus(toBase(balance, currency)),
            monthIncome: acc.monthIncome.plus(toBase(monthIncome, currency)),
            monthExpense: acc.monthExpense.plus(toBase(monthExpense, currency)),
        }),
        emptyTotals,
    );

    return {
        currency: user.baseCurrency,
        total: total.balance.toDecimalPlaces(2),
        monthIncome: total.monthIncome.toDecimalPlaces(2),
        monthExpense: total.monthExpense.toDecimalPlaces(2),
        // how many accounts the total is made of, counted with the same filter
        accountsCount: accounts.length,
        byCurrency,
        rates: rates.uah,
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

    const [totalsOf, defaultAccountId] = await Promise.all([
        getAccountTotals([account.id]),
        getDefaultAccountId(userId),
    ]);

    return {
        ...account,
        ...totalsOf(account),
        isMine: account.ownerId === userId,
        isDefault: account.id === defaultAccountId,
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

    // a new account has no transactions yet, so the totals are known without querying
    const zero = new Prisma.Decimal(0);
    return { ...account, balance: account.initialBalance, monthIncome: zero, monthExpense: zero };
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

    await prisma.$transaction(async (tx) => {
        await tx.account.update({
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

        // an archived account can't take new transactions, so it can't stay the default either
        if (data.archived) {
            await tx.user.updateMany({
                where: { id: userId, defaultAccountId: accountId },
                data: { defaultAccountId: null },
            });
        }
    });

    return getAccountById(userId, accountId);
}


export async function deleteAccount(userId: string, accountId: string) {
    const { count } = await prisma.account.deleteMany({
        where: { id: accountId, ownerId: userId },
    });
    if (count === 0) throw AppError.notFound('Account not found');
}
