import type { Request, Response } from "express";
import { changeEmailSchema, changePasswordSchema, setDefaultAccountSchema, updateProfileSchema } from "./settings.schema.js";
import { changeEmail, changePassword, setDefaultAccount, updateProfile } from "./settings.service.js";


export async function updateProfileController(req: Request, res: Response) {
    const data = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.userId, data);
    res.status(200).json({ success: true, data: user });
}

export async function setDefaultAccountController(req: Request, res: Response) {
    const data = setDefaultAccountSchema.parse(req.body);
    const user = await setDefaultAccount(req.userId, data);
    res.status(200).json({ success: true, data: user });
}

export async function changeEmailController(req: Request, res: Response) {
    const data = changeEmailSchema.parse(req.body);
    const user = await changeEmail(req.userId, data);
    res.status(200).json({ success: true, data: user });
}

export async function changePasswordController(req: Request, res: Response) {
    const data = changePasswordSchema.parse(req.body);
    await changePassword(req.userId, req.sessionId, data);
    res.status(204).send();
}
