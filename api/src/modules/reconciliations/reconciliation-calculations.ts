import { money, subtractMoney, type Money } from '@shopsense/shared';
import type { VarianceCause } from './reconciliation.types';

export function computeVariance(countedCash: Money, expectedCash: Money): Money {
  return subtractMoney(countedCash, expectedCash);
}

// Below this, a variance is small enough to plausibly be an honest miscount
// rather than something needing a real explanation. Arbitrary but documented:
// GHS 5.00 on a small shop's daily cash count is "recount and move on" money,
// not "something is wrong" money.
const COUNTING_ERROR_THRESHOLD = money(500);

/**
 * A heuristic, not a diagnosis — the data available (expected vs counted cash,
 * and how much was given away in discounts that day) cannot prove *why* a
 * variance exists, only suggest the most likely story. The owner's `notes`
 * field is where the real explanation lives; this exists so a fresh
 * reconciliation isn't just a bare number with no starting point.
 *
 * Reasoning:
 * - No variance -> no cause to explain.
 * - A shortage no larger than the day's total discounts could be fully
 *   accounted for by discounts alone (e.g. the owner mentally expected
 *   full-price cash and forgot discounts reduce what's actually collected).
 * - Any small variance, in either direction, is more likely a miscount than
 *   a real problem.
 * - A shortage too large for discounts to explain is unexplained — it is
 *   deliberately NOT assumed to be a counting error just because there's no
 *   better label, since that would understate a possibly real problem.
 * - A large overage has no discount-side explanation at all (discounts only
 *   ever reduce expected cash), so the most plausible story is cash came in
 *   for a sale that was never recorded in the system.
 */
export function classifyVariance(variance: Money, totalDiscounts: Money): VarianceCause | null {
  if (variance === 0) return null;

  const magnitude = Math.abs(variance) as Money;

  if (variance < 0) {
    if (totalDiscounts > 0 && magnitude <= totalDiscounts) return 'discount_driven';
    if (magnitude <= COUNTING_ERROR_THRESHOLD) return 'counting_error';
    return 'unexplained';
  }

  if (magnitude <= COUNTING_ERROR_THRESHOLD) return 'counting_error';
  return 'unrecorded_sale';
}
