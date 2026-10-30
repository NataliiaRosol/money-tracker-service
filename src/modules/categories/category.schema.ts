import { z } from 'zod';
import { CategoryType } from '../../generated/prisma/enums.js';
import { CATEGORY_ICONS } from './category.icons.js';

const name = z.string().trim().min(1, 'Name is required').max(50, 'Max 50 characters');
const icon = z.enum(CATEGORY_ICONS);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be in #RRGGBB format');

// POST /categories — body
export const createCategorySchema = z.object({
    name,
    type: z.enum(CategoryType),
    icon: icon.optional(),
    color: color.optional(),
});

// PATCH /categories/:id — body
export const updateCategorySchema = z
    .object({
        name: name.optional(),
        icon: icon.nullable().optional(),
        color: color.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

// /categories/:id — params
export const categoryIdParamsSchema = z.object({
    id: z.uuid(),
});

// GET /categories?type=EXPENSE — query
export const listCategoriesQuerySchema = z.object({
    type: z.enum(CategoryType).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
