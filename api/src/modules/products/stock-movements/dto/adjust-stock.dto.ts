import { IsIn, IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export type AdjustmentType = 'adjustment_damage' | 'adjustment_loss' | 'adjustment_correction';

export class AdjustStockDto {
  @IsIn(['adjustment_damage', 'adjustment_loss', 'adjustment_correction'])
  type!: AdjustmentType;

  // Signed, in the product's base unit. damage/loss must come in negative
  // (enforced in the controller, not here — it depends on `type`); correction
  // may go either way, e.g. a recount that finds more stock than expected.
  @IsInt()
  @NotEquals(0)
  quantityDelta!: number;

  @IsString()
  @MinLength(1)
  reason!: string;
}
