import type { Request, Response } from "express";
import { categoryIdParamsSchema, createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from "./category.schema.js";
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "./category.service.js";



export async function createCategoryController(req: Request, res: Response) {
    const data = createCategorySchema.parse(req.body);
    const category = await createCategory(req.userId, data);
    res.status(201).json({ success: true, data: category });
}

export async function getCategoriesController(req: Request, res: Response) {
    const query = listCategoriesQuerySchema.parse(req.query);
    const categories = await getCategories(req.userId, query);
    res.status(200).json({ success: true, data: categories });
}

export async function getCategoryController(req: Request, res: Response) {
    const { id } = categoryIdParamsSchema.parse(req.params);
    const category = await getCategoryById(req.userId, id);
    res.status(200).json({ success: true, data: category });
}


export async function updateCategoryController(req: Request, res: Response) {
    const { id } = categoryIdParamsSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);
    const category = await updateCategory(req.userId, id, data);
    res.status(200).json({ success: true, data: category });
}

export async function deleteCategoryController(req: Request, res: Response) {
    const { id } = categoryIdParamsSchema.parse(req.params);
    await deleteCategory(req.userId, id);

    res.status(204).send();

}