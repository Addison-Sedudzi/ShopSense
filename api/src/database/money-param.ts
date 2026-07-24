import { moneyToPgNumeric, type Money } from '@shopsense/shared';

/**
 * Money is minor units (pesewas) in TypeScript but Postgres NUMERIC columns
 * expect major units — passing a raw Money value straight through as a query
 * parameter inserts e.g. 1800 (GHS 18.00 in minor units) as literal 1800.00,
 * a 100x error that only shows up on the next read. Every write of a Money
 * value into a NUMERIC column must go through this first.
 */
export function moneyParam(amount: Money | null | undefined): string | null {
  return amount === null || amount === undefined ? null : moneyToPgNumeric(amount);
}
