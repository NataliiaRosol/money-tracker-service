import type { Request, Response } from "express";
import { accountIdParamsSchema, createAccountSchema, listAccountsQuerySchema, updateAccountSchema } from "./account.schema.js";
import { createAccount, deleteAccount, getAccountById, getAccounts, getTotalBalance, updateAccount } from "./account.service.js";


export async function getAccountsController(req: Request, res: Response) {
    const query = listAccountsQuerySchema.parse(req.query);
    const accounts = await getAccounts(req.userId, query);
    res.status(200).json({ success: true, data: accounts });
}

export async function getTotalBalanceController(req: Request, res: Response) {
    const totals = await getTotalBalance(req.userId);
    res.status(200).json({ success: true, data: totals });
}

export async function createAccountController(req: Request, res: Response) {
    const data = createAccountSchema.parse(req.body);
    const account = await createAccount(req.userId, data);
    res.status(201).json({ success: true, data: account });
}

export async function getAccountController(req: Request, res: Response) {
    const { id } = accountIdParamsSchema.parse(req.params);
    const account = await getAccountById(req.userId, id);
    res.status(200).json({ success: true, data: account });
}

export async function updateAccountController(req: Request, res: Response) {
    const { id } = accountIdParamsSchema.parse(req.params);
    const data = updateAccountSchema.parse(req.body);
    const account = await updateAccount(req.userId, id, data);
    res.status(200).json({ success: true, data: account });
}

export async function deleteAccountController(req: Request, res: Response) {
    const { id } = accountIdParamsSchema.parse(req.params);
    await deleteAccount(req.userId, id);
    res.status(204).send();
}