/**
 * Application-concept tokens: a fixed set of semantic states mapped to the
 * Tailwind classes for their tone, so a component takes a typed union
 * ('low-stock', not any string) and an invalid state is a compile error
 * rather than a class name that silently does nothing.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const statusToneClasses: Record<StatusTone, string> = {
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-brand-600',
  neutral: 'bg-surface-muted text-ink-500',
};

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export const stockStatusTone: Record<StockStatus, StatusTone> = {
  'in-stock': 'success',
  'low-stock': 'warning',
  'out-of-stock': 'danger',
};

export const stockStatusLabel: Record<StockStatus, string> = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
};

export function stockStatusFor(currentStock: number, reorderThreshold: number): StockStatus {
  if (currentStock <= 0) return 'out-of-stock';
  if (currentStock <= reorderThreshold) return 'low-stock';
  return 'in-stock';
}
