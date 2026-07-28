import { z } from 'zod';

export type {
  DailyBriefing,
  DailyBriefingFacts,
  LowStockItem,
  ProductPerformance,
  ReconciliationStatus,
} from '@shopsense/shared';

// Claude only ever supplies the prose. Every number in DailyBriefingFacts is
// computed server-side and handed to the model as fact, not derived by it —
// language models are unreliable at exact aggregation, and every figure here
// must be independently verifiable against the underlying data.
export const BriefingSummarySchema = z.object({
  summary: z.string(),
});
