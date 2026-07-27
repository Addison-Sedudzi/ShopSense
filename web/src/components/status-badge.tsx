import type { ReactNode } from 'react';
import { statusToneClasses, type StatusTone } from '@/lib/design-tokens';

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${statusToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
