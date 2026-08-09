import { z } from 'zod';

/**
 * Zod Schemas for Authentication and Input Validation
 */

export const emailSchema = z
  .string()
  .trim()
  .email({ message: 'Please enter a valid email address' })
  .refine((val) => !/^\d+@/.test(val), { message: 'Email prefix cannot contain only numbers' })
  .transform((email) => email.toLowerCase());

export const registrationPasswordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(128, { message: 'Password must not exceed 128 characters' });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' }).max(128),
  deviceFingerprint: z.string().optional(),
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name must not exceed 50 characters' })
    .refine((val) => !/^\d+$/.test(val), { message: 'Name cannot contain only numbers' }),
  email: emailSchema,
  password: registrationPasswordSchema,
  deviceFingerprint: z.string().optional(),
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});
