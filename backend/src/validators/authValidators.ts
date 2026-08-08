import { z } from 'zod';

/**
 * Zod Schemas for Authentication and Input Validation
 */

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(1, { message: 'Password is required' }),
  deviceFingerprint: z.string().optional(),
  // Honeypot fields are optional but must be checked in riskEngine/honeypot middleware
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }).max(50),
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  deviceFingerprint: z.string().optional(),
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  code: z.string().min(4, { message: 'Verification code must be at least 4 digits' }).max(8),
  website_honey: z.string().optional(),
  email_honey: z.string().optional(),
  phone_honey: z.string().optional(),
});
