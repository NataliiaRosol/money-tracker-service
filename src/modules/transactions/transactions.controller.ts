import type { Request, Response } from "express";
import { createTransactionSchema, listTransactionsQuerySchema, transactionIdParamsSchema, updateTransactionSchema } from "./transactions.schema.js";
import { createTransaction, deleteTransaction, getTransactionById, getTransactions, updateTransaction } from "./transactions.service.js";


export async function getTransactionsController(req: Request, res: Response) {
    const query = listTransactionsQuerySchema.parse(req.query);
    const { items, meta } = await getTransactions(req.userId, query);
    res.status(200).json({ success: true, data: items, meta });
}

export async function createTransactionController(req: Request, res: Response) {
    const data = createTransactionSchema.parse(req.body);
    const transaction = await createTransaction(req.userId, data);
    res.status(201).json({ success: true, data: transaction });
}

export async function getTransactionController(req: Request, res: Response) {
    const { id } = transactionIdParamsSchema.parse(req.params);
    const transaction = await getTransactionById(req.userId, id);
    res.status(200).json({ success: true, data: transaction });
}

export async function updateTransactionController(req: Request, res: Response) {
    const { id } = transactionIdParamsSchema.parse(req.params);
    const data = updateTransactionSchema.parse(req.body);
    const transaction = await updateTransaction(req.userId, id, data);
    res.status(200).json({ success: true, data: transaction });
}

export async function deleteTransactionController(req: Request, res: Response) {
    const { id } = transactionIdParamsSchema.parse(req.params);
    await deleteTransaction(req.userId, id);
    res.status(204).send();
}
