import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';
import type { ProductUnit } from '../product.types';

// Matches the shape moneyFromPgNumeric expects: a plain non-negative decimal
// with at most 2 places, e.g. "12.50" or "100". Rejects things like "12.5.0",
// scientific notation, or a leading "+"/"-" — cost and selling price are
// never negative.
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @IsIn(['piece', 'carton'])
  unit!: ProductUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerCarton?: number | null;

  @Matches(MONEY_PATTERN, { message: 'costPrice must be a decimal amount like "12.50"' })
  costPrice!: string;

  @Matches(MONEY_PATTERN, { message: 'sellingPrice must be a decimal amount like "18.00"' })
  sellingPrice!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;
}
