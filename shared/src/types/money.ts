/**
 * Money is represented as an integer number of minor units (pesewas; 100 = GHS 1).
 * Postgres NUMERIC arrives over `pg` as a decimal string, and native `number`/`Number()`
 * cannot represent decimal currency exactly, so all money crossing any boundary
 * (SQL, JSON, arithmetic) goes through this integer representation instead.
 */
declare const MoneyBrand: unique symbol;
export type Money = number & { readonly [MoneyBrand]: typeof MoneyBrand };

const MINOR_UNITS_PER_MAJOR = 100;

export function money(minorUnits: number): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(
      `Money must be an integer number of minor units (pesewas), got ${minorUnits}`,
    );
  }
  return minorUnits as Money;
}

export const ZERO_MONEY: Money = money(0);

/**
 * Parses a Postgres NUMERIC string (e.g. "1234.56" or "-5.00") into minor units
 * using only integer arithmetic on the split parts, so no precision is lost
 * the way it would be by routing the value through parseFloat.
 */
export function moneyFromPgNumeric(value: string): Money {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  const cents = (fractionPart + '00').slice(0, 2);
  const minorUnits = Number(wholePart || '0') * MINOR_UNITS_PER_MAJOR + Number(cents);
  return money(negative ? -minorUnits : minorUnits);
}

/** Inverse of moneyFromPgNumeric: formats as a decimal string for a $1::numeric parameter. */
export function moneyToPgNumeric(amount: Money): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const cents = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${cents}`;
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

export function negateMoney(a: Money): Money {
  return money(-a);
}

/** Multiplies a money amount by a plain scalar (e.g. unit price * quantity), rounding to the nearest minor unit. */
export function scaleMoney(amount: Money, factor: number): Money {
  return money(Math.round(amount * factor));
}

export function sumMoney(amounts: readonly Money[]): Money {
  return amounts.reduce(addMoney, ZERO_MONEY);
}

export function formatGHS(amount: Money): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount / MINOR_UNITS_PER_MAJOR);
}
