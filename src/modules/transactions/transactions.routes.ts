import { Router } from "express";
import { createTransactionController, deleteTransactionController, getTransactionController, getTransactionsController, updateTransactionController } from "./transactions.controller.js";


export const transactionsRouter = Router();

transactionsRouter.get("/", getTransactionsController);
transactionsRouter.post("/", createTransactionController);
transactionsRouter.get("/:id", getTransactionController);
transactionsRouter.patch("/:id", updateTransactionController);
transactionsRouter.delete("/:id", deleteTransactionController);
