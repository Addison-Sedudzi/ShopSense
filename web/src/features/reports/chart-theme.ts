/**
 * Recharts renders to SVG in its own coordinate system and doesn't reliably
 * resolve CSS custom properties passed as raw stroke/fill attributes, so
 * chart colors are these concrete hex values instead of var(--color-*) —
 * kept in exact sync with index.css's @theme tokens by hand, since there's
 * no build-time bridge between the two here.
 */
export const chartColors = {
  brand: '#1d4ed8', // --color-brand-600
  ink: '#667085', // --color-ink-500
  grid: '#e4e7ec', // --color-border
  success: '#16a34a', // --color-success-500
  danger: '#dc2626', // --color-danger-500
};
