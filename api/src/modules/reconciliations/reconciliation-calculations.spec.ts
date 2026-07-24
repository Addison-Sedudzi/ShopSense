import { money } from '@shopsense/shared';
import { classifyVariance, computeVariance } from './reconciliation-calculations';

describe('computeVariance', () => {
  it('is positive when counted exceeds expected (an overage)', () => {
    expect(computeVariance(money(1050), money(1000))).toBe(50);
  });

  it('is negative when counted is less than expected (a shortage)', () => {
    expect(computeVariance(money(950), money(1000))).toBe(-50);
  });

  it('is zero when counted matches expected exactly', () => {
    expect(computeVariance(money(1000), money(1000))).toBe(0);
  });
});

describe('classifyVariance', () => {
  it('returns null when there is no variance', () => {
    expect(classifyVariance(money(0), money(200))).toBeNull();
  });

  it('attributes a shortage to discounts when it fits within the day\'s discount total', () => {
    // shortage of 300, 400 given in discounts that day -> plausibly explained
    expect(classifyVariance(money(-300), money(400))).toBe('discount_driven');
  });

  it('attributes a shortage exactly equal to total discounts to discounts', () => {
    expect(classifyVariance(money(-400), money(400))).toBe('discount_driven');
  });

  it('does not attribute a shortage to discounts when no discounts were given', () => {
    expect(classifyVariance(money(-300), money(0))).not.toBe('discount_driven');
  });

  it('treats a small shortage beyond discounts as a counting error', () => {
    // shortage of 200 (GHS 2.00), no discounts that day, under the GHS 5 threshold
    expect(classifyVariance(money(-200), money(0))).toBe('counting_error');
  });

  it('treats a large unexplained shortage as unexplained, not a silent counting error', () => {
    // shortage of 10000 (GHS 100), no discounts, far beyond the counting-error threshold
    expect(classifyVariance(money(-10000), money(0))).toBe('unexplained');
  });

  it('treats a small overage as a counting error', () => {
    expect(classifyVariance(money(200), money(0))).toBe('counting_error');
  });

  it('treats a large overage as an unrecorded sale', () => {
    expect(classifyVariance(money(10000), money(0))).toBe('unrecorded_sale');
  });

  it('a shortage larger than the day\'s discounts is not automatically discount_driven', () => {
    // shortage of 1000, only 200 given in discounts -> discounts can't fully explain it
    expect(classifyVariance(money(-1000), money(200))).not.toBe('discount_driven');
  });
});
