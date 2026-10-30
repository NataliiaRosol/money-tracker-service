import { Router } from "express";
import { createCategoryController, deleteCategoryController, getCategoriesController, getCategoryController, updateCategoryController } from "./category.controller.js";

export const categoryRouter = Router();

categoryRouter.post("/", createCategoryController);
categoryRouter.get("/", getCategoriesController);
categoryRouter.get("/:id", getCategoryController);
categoryRouter.patch("/:id", updateCategoryController);
categoryRouter.delete("/:id", deleteCategoryController);

