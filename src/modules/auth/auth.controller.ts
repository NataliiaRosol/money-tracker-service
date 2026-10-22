import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { getCurrentUser, login, logout, refresh, register, type SessionMeta } from "./auth.service.js";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "./tokens.js";



function getSessionMeta(req: Request): SessionMeta {
    return { userAgent: req.get("user-agent"), ip: req.ip };
}

// cookie-parser може розпарсити "j:..." cookie в об'єкт — беремо тільки рядок
function getRefreshToken(req: Request): string | undefined {
    const token = req.cookies?.[REFRESH_COOKIE];
    return typeof token === "string" ? token : undefined;
}

export async function registerController(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await register(data, getSessionMeta(req));
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
}

export async function loginController(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await login(data, getSessionMeta(req));
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: { user, accessToken } });
}

export async function refreshController(req: Request, res: Response) {
    const { accessToken, refreshToken } = await refresh(getRefreshToken(req));
    // null — паралельний запит у grace-періоді, новий токен клієнт уже отримав у cookie з першої відповіді
    if (refreshToken) setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: { accessToken } });
}

export async function meController(req: Request, res: Response) {
    const user = await getCurrentUser(req.userId);
    res.status(200).json({ success: true, data: user });
}

export async function logoutController(req: Request, res: Response) {
    await logout(getRefreshToken(req));
    clearRefreshCookie(res);

    res.status(204).send();
}
