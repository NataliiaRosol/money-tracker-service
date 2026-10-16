import type { RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

export const notFoundHandler: RequestHandler = (req, res, next) => {
    next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
