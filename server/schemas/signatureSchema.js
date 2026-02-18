const { z } = require('zod');

const signatureSchema = z.object({
  documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Document ID format'),
  page: z.coerce.number().int().min(1, 'Page must be at least 1'),
  x: z.coerce.number().min(0).max(800, 'X coordinate out of bounds'), 
  y: z.coerce.number().min(0).max(5000, 'Y coordinate out of bounds'), 
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  signatureData: z.string().optional().nullable(),
  signerEmail: z.string().email().trim().toLowerCase().or(z.literal('')).optional().nullable(),
  signerName: z.string().trim().optional().nullable(),
});

const updateSignatureSchema = z.object({
  x: z.coerce.number().min(0).max(800).optional(),
  y: z.coerce.number().min(0).max(5000).optional(),
  page: z.coerce.number().int().min(1).optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  signatureData: z.string().optional().nullable(),
});

module.exports = {
  signatureSchema,
  updateSignatureSchema
};
