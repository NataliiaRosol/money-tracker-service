import { AppError } from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { DEFAULT_CATEGORIES } from "./category.defaults.js";
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from "./category.schema.js";

export async function createDefaultCategories(userId: string) {
    await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
        skipDuplicates: true,
    });
}


export async function createCategory(userId: string, data: CreateCategoryInput) {
    const existing = await prisma.category.findFirst({
        where: {
            userId,
            name: { equals: data.name, mode: 'insensitive' },
            type: data.type,
        },
    });
    if (existing) throw AppError.conflict('Category with this name already exists');

    return prisma.category.create({
        data: {
            userId,
            name: data.name,
            type: data.type,
            icon: data.icon ?? null,
            color: data.color ?? null,
        },
    });
}

export async function getCategories(userId: string, query: ListCategoriesQuery) {
    return prisma.category.findMany({
        where: {
            userId,
            ...(query.type && { type: query.type }),
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
}

export async function updateCategory(userId: string, categoryId: string, data: UpdateCategoryInput) {

    const category = await prisma.category.findFirst({
        where: { id: categoryId, userId },
    });
    if (!category) throw AppError.notFound('Category not found');

    if (data.name !== undefined) {
        const duplicate = await prisma.category.findFirst({
            where: {
                userId,
                type: category.type,
                name: { equals: data.name, mode: 'insensitive' },
                id: { not: categoryId },
            },
        });
        if (duplicate) throw AppError.conflict('Category with this name already exists');
    }

    return prisma.category.update({
        where: { id: categoryId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.icon !== undefined && { icon: data.icon }),
            ...(data.color !== undefined && { color: data.color }),
        },
    });
}


export async function deleteCategory(userId: string, categoryId: string) {
    const { count } = await prisma.category.deleteMany({
        where: { id: categoryId, userId },
    });
    if (count === 0) throw AppError.notFound('Category not found');
}