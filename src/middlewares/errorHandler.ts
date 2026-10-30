import type { ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../errors/AppError.js';

function toAppError(err: unknown): AppError {
    if (err instanceof AppError) return err;

    if (err instanceof ZodError) {
        return new AppError(400, 'Validation failed', 'VALIDATION_ERROR', z.flattenError(err));
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') return new AppError(409, 'Already exists', 'CONFLICT');   // unique
        if (err.code === 'P2025') return new AppError(404, 'Not found', 'NOT_FOUND');        // запис не знайдено
        if (err.code === 'P2003') return new AppError(400, 'Invalid reference', 'FK_ERROR'); // foreign key
    }

    // невалідний JSON у body (помилка від express.json())
    if ((err as any)?.type === 'entity.parse.failed') {
        return new AppError(400, 'Invalid JSON', 'INVALID_JSON');
    }

    return new AppError(500, 'Internal server error', 'INTERNAL');
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const appErr = toAppError(err);
    if (appErr.statusCode >= 500) console.error(err); // логуємо тільки неочікувані помилки

    res.status(appErr.statusCode).json({
        success: false,
        error: { code: appErr.code, message: appErr.message, details: appErr.details },
    });
};
