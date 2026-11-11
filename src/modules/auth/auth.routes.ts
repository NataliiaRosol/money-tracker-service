import { Router } from "express";
import { emailSendLimiter, loginLimiter, registerLimiter } from "../../middlewares/rateLimit.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import {
    loginController,
    logoutController,
    meController,
    refreshController,
    registerController,
    resendVerificationController,
    verifyEmailController,
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, registerController);
authRouter.post("/login", loginLimiter, loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", requireAuth, meController);
// public: the token from the email is the proof, the user may open the link on a device where they aren't logged in.
// No rate limit needed: a 48-byte random token can't be brute-forced
authRouter.post("/verify-email", verifyEmailController);
authRouter.post("/verify-email/resend", requireAuth, emailSendLimiter, resendVerificationController);
