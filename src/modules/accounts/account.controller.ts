import type { Request, Response } from "express";
import { createAccountSchema, listAccountsQuerySchema } from "./account.schema.js";
import { createAccount, getAccounts } from "./account.service.js";


export async function getAccountsController(req: Request, res: Response) {
    const query = listAccountsQuerySchema.parse(req.query);
    const accounts = await getAccounts(req.userId, query);
    res.status(200).json({ success: true, data: accounts });
}

export async function createAccountController(req: Request, res: Response) {
    const data = createAccountSchema.parse(req.body);
    const account = await createAccount(req.userId, data);
    res.status(201).json({ success: true, data: account });
}

export async function getAccountController(req: Request, res: Response) {
    // потрбно повертати дані 
}