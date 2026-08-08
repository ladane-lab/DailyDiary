import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import logger from '../lib/logger.js';

/**
 * SQL Injection (SQLi) Defense Model:
 * 
 * 1. Zod Validation: Enforces strict data types, schemas, and formats (e.g., checking that an ID 
 *    is a valid UUID, email is a valid email, and integers don't contain characters). Malformed 
 *    type syntax is rejected before database compilation.
 * 2. Prisma Parameterized Queries: All standard query operations compile inputs into parameterized
 *    bindings, ensuring SQL engines treat data variables strictly as literals (data values) rather 
 *    than executable code segments.
 * 3. NO Regex Keyword Scanning: Regex checks are slow, CPU-intensive, and prone to evasion/false-positives.
 */

// Basic safe parameter schemas
export const COMMON_SCHEMAS = {
  id: z.string().uuid({ message: 'Invalid identifier format (UUID required)' }),
  email: z.string().email({ message: 'Invalid email address format' }),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid pagination cursor format' }).optional(),
};

// Sync payload schema
export const userSyncSchema = z.object({
  email: COMMON_SCHEMAS.email,
  name: z.string().min(1, { message: 'Name is required' }).max(100),
  photoURL: z.string().url().nullable().optional(),
});

// Entry creation schema
export const entryCreateSchema = z.object({
  body: z.string().max(100000, { message: 'Entry content is too long' }).optional().default(''),
  templateId: z.string().uuid().optional().nullable(),
  theme: z.string().max(30).default('marble'),
  isPublic: z.boolean().default(false),
  images: z.array(z.union([z.string(), z.object({ url: z.string() })])).optional().default([]),
  responses: z.array(z.object({
    fieldLabel: z.string().max(100),
    value: z.string().max(1000)
  })).optional().default([]),
});

// Entry update schema
export const entryUpdateSchema = z.object({
  body: z.string().max(100000).optional(),
  theme: z.string().max(30).optional(),
  isPublic: z.boolean().optional(),
  images: z.array(z.union([z.string(), z.object({ url: z.string() })])).optional(),
  responses: z.array(z.object({
    fieldLabel: z.string().max(100),
    value: z.string().max(1000)
  })).optional(),
});

// URL/params ID check schema
export const idParamSchema = z.object({
  id: COMMON_SCHEMAS.id,
});

// Comment validation schema
export const commentBodySchema = z.object({
  content: z.string().trim().min(1, { message: 'Comment is required' }).max(2000, { message: 'Comment content is too long' }),
});

// Query pagination check schema
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Validation Middleware generator for Express request bodies.
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      handleValidationError(error, res);
    }
  };
};

/**
 * Validation Middleware generator for Express request query parameters.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      handleValidationError(error, res);
    }
  };
};

/**
 * Validation Middleware generator for Express request params.
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      handleValidationError(error, res);
    }
  };
};

function handleValidationError(error: unknown, res: Response): void {
  if (error instanceof ZodError) {
    const issues = (error as ZodError).issues;
    const message = issues[0]?.message || 'Input validation failed';
    res.status(400).json({ error: message, details: issues });
    return;
  }
  res.status(400).json({ error: 'Invalid input formatting' });
}
export default { validateBody, validateQuery, validateParams };
