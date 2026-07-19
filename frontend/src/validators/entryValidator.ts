import { z } from 'zod';

export const createEntrySchema = z.object({
  body: z.string().optional(),
  templateId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  theme: z.string().optional(),
  timezoneOffset: z.number().optional(),
  responses: z
    .array(
      z.object({
        fieldLabel: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  images: z.array(z.string().url()).optional(),
}).refine(data => (data.body && data.body.trim().length > 0) || (data.images && data.images.length > 0), {
  message: 'Journal content or at least one image is required',
  path: ['body'],
});
