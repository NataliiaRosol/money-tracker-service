import { AppError } from "../../errors/AppError.js";
import { Prisma, type CategoryType } from "../../generated/prisma/browser.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateAccountInput, ListAccountsQuery } from "./account.schema.js";

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
        return {
            ...account,
            balance: account.initialBalance.plus(totalIncome).minus(totalExpense),
        };
    });
}

export async function createAccount(userId: string, data: CreateAccountInput) {
    const existing = await prisma.account.findFirst({
        where: {
            ownerId: userId,
            name: data.name
        }
    });

    if (existing) {
        throw AppError.conflict("Account with this name already exists");
    }

    return prisma.account.create({
        data: {
            ownerId: userId,
            name: data.name,
            type: data.type ?? 'CARD',
            currency: data.currency,
            initialBalance: data.initialBalance ?? '0.0000',
            color: data.color ?? null,
        }
    });
}   