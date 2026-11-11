import { Router } from "express";
import { passwordCheckLimiter } from "../../middlewares/rateLimit.js";
import { changeEmailController, changePasswordController, setDefaultAccountController, updateProfileController } from "./settings.controller.js";


export const settingsRouter = Router();

settingsRouter.patch("/profile", updateProfileController);
settingsRouter.patch("/default-account", setDefaultAccountController);
settingsRouter.patch("/email", passwordCheckLimiter, changeEmailController);
settingsRouter.patch("/password", passwordCheckLimiter, changePasswordController);
