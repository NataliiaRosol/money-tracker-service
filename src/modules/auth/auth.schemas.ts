import z from "zod";

// shared with settings, so registration and profile changes follow the same rules
export const emailField = z.string().trim().toLowerCase().email();
export const passwordField = z.string().min(8).max(128); // rules for a new password
export const nameField = z.string().trim().min(1).max(100);

export const registerSchema = z.object({
    email: emailField,
    password: passwordField,
    name: nameField.optional(),
});

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1).max(128),
});

// generateToken() gives 64 chars; max just cuts off junk before hashing
export const verifyEmailSchema = z.object({
    token: z.string().min(1).max(256),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
