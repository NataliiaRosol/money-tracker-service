// src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    // База даних
    DATABASE_URL: z.url(),

    // Авторизація
    //   JWT_SECRET: z.string().min(32),
    //   JWT_EXPIRES_IN: z.string().default('15m'),

    //   // CORS / фронтенд
    //   CORS_ORIGIN: z.string().default('http://localhost:5173'),

    //   // Опціональні сервіси
    //   REDIS_URL: z.string().url().optional(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Невалідні змінні оточення:', z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;