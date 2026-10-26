import { Router } from "express";
import { createAccountController, getAccountsController } from "./account.controller.js";


export const accountRouter = Router();

accountRouter.get("/", getAccountsController);
accountRouter.post("/", createAccountController);
accountRouter.get("/:id", getAccountController);
accountRouter.patch("/:id", updateAccountController);
accountRouter.delete("/:id", deleteAccountController);