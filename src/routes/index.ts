import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { categoryRouter } from "../modules/categories/category.routes.js";

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/categories', categoryRouter);