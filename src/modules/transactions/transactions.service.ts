import { AppError } from "../../errors/AppError.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateTransactionInput, ListTransactionsQuery, UpdateTransactionInput } from "./transactions.schema.js";

const transactionInclude = {
    account: { select: { id: true, name: true, currency: true, icon: true, color: true } },
    category: { select: { id: true, name: true, type: true, icon: true, color: true } },
} satisfies Prisma.TransactionInclude;

const transactionDetailsInclude = {
    ...transactionInclude,
    author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.TransactionInclude;

// the account must belong to the user and not be archived
async function assertAccountWritable(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
        where: { id: accountId, ownerId: userId },
        select: { archived: true },
    });
    if (!account) throw AppError.notFound('Account not found');
    if (account.archived) throw AppError.badRequest('Cannot add a transaction to an archived account');
}

// income/expense comes from the category, so the transaction gets its type from here
async function assertCategoryExists(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
    });
    if (!category) throw AppError.notFound('Category not found');
}

export async function getTransactions(userId: string, query: ListTransactionsQuery) {
    const { page, limit } = query;

    const where: Prisma.TransactionWhereInput = {
        account: { ownerId: userId },
        ...(query.accountIds && { accountId: { in: query.accountIds } }),
        ...(query.categoryIds && { categoryId: { in: query.categoryIds } }),
        ...(query.type && { category: { type: query.type } }),
        ...(query.search && { description: { contains: query.search, mode: 'insensitive' } }),
        date: {
            ...(query.from && { gte: query.from }),
            ...(query.to && { lte: query.to }),
        },
        amount: {
            ...(query.minAmount && { gte: query.minAmount }),
            ...(query.maxAmount && { lte: query.maxAmount }),
        },
    };

    const [items, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
            include: transactionInclude,
        }),
        prisma.transaction.count({ where }),
    ]);

    return {
        items,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function createTransaction(userId: string, data: CreateTransactionInput) {
    await Promise.all([
        assertAccountWritable(userId, data.accountId),
        assertCategoryExists(userId, data.categoryId),
    ]);

    return prisma.transaction.create({
        data: {
            accountId: data.accountId,
            categoryId: data.categoryId,
            authorId: userId,
            amount: data.amount,
            date: data.date,
            // empty string after trim → null
            description: data.description || null,
        },
        include: transactionInclude,
    });
}

export async function getTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, account: { ownerId: userId } },
        include: transactionDetailsInclude,
    });
    if (!transaction) throw AppError.notFound('Transaction not found');
    return transaction;
}

export async function updateTransaction(userId: string, transactionId: string, data: UpdateTransactionInput) {
    const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, account: { ownerId: userId } },
        select: { id: true },
    });
    if (!transaction) throw AppError.notFound('Transaction not found');

    // check only what changes; undefined means the field is not being updated
    await Promise.all([
        data.accountId !== undefined && assertAccountWritable(userId, data.accountId),
        data.categoryId !== undefined && assertCategoryExists(userId, data.categoryId),
    ]);

    return prisma.transaction.update({
        where: { id: transactionId },
        data: {
            ...(data.accountId !== undefined && { accountId: data.accountId }),
            ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
            ...(data.amount !== undefined && { amount: data.amount }),
            ...(data.date !== undefined && { date: data.date }),
            // null or empty string clears the description
            ...(data.description !== undefined && { description: data.description || null }),
        },
        include: transactionDetailsInclude,
    });
}

export async function deleteTransaction(userId: string, transactionId: string) {
    const { count } = await prisma.transaction.deleteMany({
        where: { id: transactionId, account: { ownerId: userId } },
    });
    if (count === 0) throw AppError.notFound('Transaction not found');
}
