import { z } from 'zod';

// Mirrors — but is a separate implementation from — the validation rules in
// api/src/modules/products/dto/create-product.dto.ts. The backend uses
// class-validator across every DTO in the project, so migrating just this
// one to Zod purely to share it here would be an inconsistent one-off; this
// is deliberately duplicated and kept honest about it, the same tradeoff
// cart-math.ts made for mirroring the backend's sale total calculation.
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  sku: z.string().trim().optional(),
  unit: z.enum(['piece', 'carton']),
  unitsPerCarton: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), 'Must be a whole number')
    .refine((value) => !value || Number(value) > 0, 'Must be greater than 0'),
  costPrice: z.string().trim().regex(MONEY_PATTERN, 'Enter a decimal amount like 12.50'),
  sellingPrice: z.string().trim().regex(MONEY_PATTERN, 'Enter a decimal amount like 18.00'),
  reorderThreshold: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), 'Must be a whole number'),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
