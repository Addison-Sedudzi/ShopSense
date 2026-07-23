import {
  addMoney,
  formatGHS,
  type Money,
  money,
  moneyFromPgNumeric,
  moneyToPgNumeric,
  negateMoney,
  scaleMoney,
  subtractMoney,
  sumMoney,
  ZERO_MONEY,
} from './money';

describe('money construction', () => {
  it('accepts an integer number of minor units', () => {
    expect(money(19999)).toBe(19999);
  });

  it('rejects a non-integer amount', () => {
    expect(() => money(19.99)).toThrow(/integer/);
  });

  it('cannot be assigned from a plain number without going through money()', () => {
    // @ts-expect-error a raw number is not a Money — this is the whole point of the branded type
    const notMoney: Money = 1999;
    void notMoney;
  });
});

describe('moneyFromPgNumeric / moneyToPgNumeric', () => {
  it('parses a Postgres NUMERIC string exactly, without float error', () => {
    expect(moneyFromPgNumeric('19.99')).toBe(1999);
    expect(moneyFromPgNumeric('0.10')).toBe(10);
    expect(moneyFromPgNumeric('100')).toBe(10000);
  });

  it('round-trips a value that breaks naive floating point arithmetic', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE 754 float; the integer-minor-units path avoids that entirely
    const a = moneyFromPgNumeric('0.10');
    const b = moneyFromPgNumeric('0.20');
    expect(addMoney(a, b)).toBe(moneyFromPgNumeric('0.30'));
  });

  it('handles negative amounts', () => {
    expect(moneyFromPgNumeric('-5.00')).toBe(-500);
    expect(moneyToPgNumeric(money(-500))).toBe('-5.00');
  });

  it('formats back to a decimal string for a $1::numeric parameter', () => {
    expect(moneyToPgNumeric(money(1999))).toBe('19.99');
    expect(moneyToPgNumeric(ZERO_MONEY)).toBe('0.00');
  });
});

describe('arithmetic helpers', () => {
  it('adds and subtracts', () => {
    expect(addMoney(money(500), money(250))).toBe(750);
    expect(subtractMoney(money(500), money(250))).toBe(250);
  });

  it('negates', () => {
    expect(negateMoney(money(500))).toBe(-500);
  });

  it('scales by a scalar quantity and rounds to the nearest minor unit', () => {
    expect(scaleMoney(money(333), 3)).toBe(999);
    expect(scaleMoney(money(100), 1.5)).toBe(150);
    expect(scaleMoney(money(10), 1 / 3)).toBe(3);
  });

  it('sums an array, defaulting to zero', () => {
    expect(sumMoney([])).toBe(0);
    expect(sumMoney([money(100), money(200), money(300)])).toBe(600);
  });
});

describe('formatGHS', () => {
  it('formats minor units as a Ghana cedi string', () => {
    expect(formatGHS(money(1999))).toBe('GH₵19.99');
    expect(formatGHS(ZERO_MONEY)).toBe('GH₵0.00');
  });
});
