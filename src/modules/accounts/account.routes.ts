import { Router } from "express";
import { createAccountController, deleteAccountController, getAccountController, getAccountsController, getTotalBalanceController, updateAccountController } from "./account.controller.js";


export const accountRouter = Router();

accountRouter.get("/", getAccountsController);
accountRouter.post("/", createAccountController);
accountRouter.get("/total", getTotalBalanceController);
// accountRouter.post("/:id", updateAccountBalanceController);
accountRouter.get("/:id", getAccountController);
accountRouter.patch("/:id", updateAccountController);
accountRouter.delete("/:id", deleteAccountController);