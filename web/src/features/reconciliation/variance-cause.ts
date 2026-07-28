import type { VarianceCause } from '@shopsense/shared';
import type { StatusTone } from '@/lib/design-tokens';

/**
 * Record<VarianceCause, T> is itself the exhaustiveness guarantee the doc
 * asks for: TypeScript requires every member of the VarianceCause union to
 * have an entry here. If the backend ever adds a fifth cause, these two
 * lookups fail to compile until updated — there's no way to silently ship a
 * UI that doesn't know what to say about a cause that exists.
 */
export const varianceCauseLabel: Record<VarianceCause, string> = {
  discount_driven: 'Likely explained by discounts given',
  unrecorded_sale: 'Possible unrecorded sale',
  counting_error: 'Likely a counting error',
  unexplained: 'Unexplained — worth a closer look',
};

export const varianceCauseTone: Record<VarianceCause, StatusTone> = {
  discount_driven: 'info',
  unrecorded_sale: 'warning',
  counting_error: 'neutral',
  unexplained: 'danger',
};
