import { z } from 'zod';
import type { RestockRecommendation } from '@shopsense/shared';

export type { RestockRecommendation };

export interface RestockCandidate {
  productId: string;
  productName: string;
  reorderThreshold: number;
  currentStock: number;
  quantitySoldLast4Weeks: number;
  supplierName: string | null;
  supplierLeadTimeDays: number | null;
}

/**
 * The productId field is a dynamic enum of exactly the candidates sent this
 * request — not a free-form string. Claude cannot recommend reordering a
 * product it wasn't shown, which is what keeps this a bounded, verifiable
 * recommendation rather than free-text the server has to trust.
 */
export function buildRestockSchema(candidateIds: readonly string[]) {
  const [first, ...rest] = candidateIds;
  return z.object({
    recommendations: z.array(
      z.object({
        productId: z.enum([first, ...rest] as [string, ...string[]]),
        suggestedQuantity: z.number().int().positive(),
        reason: z.string(),
      }),
    ),
  });
}
