import type { RequestHandler } from 'express';
import { TEST_USER_ID } from '../config/dev.js';

// TODO: тимчасова заглушка, поки немає реєстрації/логіну.
// Замінити на справжній auth middleware, який дістає userId з токена.
export const devAuth: RequestHandler = (req, _res, next) => {
    req.userId = TEST_USER_ID;
    next();
};
