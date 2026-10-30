export class AppError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }

    static notFound(msg = 'Not found') { return new AppError(404, msg, 'NOT_FOUND'); }
    static badRequest(msg: string, details?: unknown) { return new AppError(400, msg, 'BAD_REQUEST', details); }
    static conflict(msg: string) { return new AppError(409, msg, 'CONFLICT'); }
    static unauthorized(msg = 'Unauthorized') { return new AppError(401, msg, 'UNAUTHORIZED'); }
    static forbidden(msg = 'Forbidden') { return new AppError(403, msg, 'FORBIDDEN'); }
    static tooManyRequests(msg = 'Too many requests') { return new AppError(429, msg, 'TOO_MANY_REQUESTS'); }
    static serviceUnavailable(msg = 'Service unavailable') { return new AppError(503, msg, 'SERVICE_UNAVAILABLE'); }
}
