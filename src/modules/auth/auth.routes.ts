import { Router } from "express";
import { loginLimiter, registerLimiter } from "../../middlewares/rateLimit.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { loginController, logoutController, meController, refreshController, registerController } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, registerController);
authRouter.post("/login", loginLimiter, loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", requireAuth, meController);
