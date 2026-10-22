import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { categoryRouter } from "../modules/categories/category.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/categories', requireAuth, categoryRouter);