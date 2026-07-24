import { IsIn, Matches } from 'class-validator';

// Percentage discounts can carry up to 4 decimal places (matching the schema's
// discount_value numeric(12,4)); fixed_amount is money, so at most 2. Both are
// accepted here and the type-specific range/precision is enforced where the
// discount is actually resolved to Money, not in this shape-only check.
const DISCOUNT_VALUE_PATTERN = /^\d+(\.\d{1,4})?$/;

export class DiscountDto {
  @IsIn(['percentage', 'fixed_amount'])
  type!: 'percentage' | 'fixed_amount';

  @Matches(DISCOUNT_VALUE_PATTERN, { message: 'value must be a plain decimal number' })
  value!: string;
}
