import { Router } from "express";
import { createCategoryController, deleteCategoryController, getCategoriesController, updateCategoryController } from "./category.controller.js";

export const categoryRouter = Router();

categoryRouter.post("/", createCategoryController);
categoryRouter.get("/", getCategoriesController);
categoryRouter.patch("/:id", updateCategoryController);
categoryRouter.delete("/:id", deleteCategoryController);

