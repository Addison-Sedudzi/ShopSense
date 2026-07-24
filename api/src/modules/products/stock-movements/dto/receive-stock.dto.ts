import { IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';
import type { ProductUnit } from '../../product.types';

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class ReceiveStockDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsIn(['piece', 'carton'])
  unit!: ProductUnit;

  @IsOptional()
  @Matches(MONEY_PATTERN, { message: 'unitCost must be a decimal amount like "9.50"' })
  unitCost?: string;
}
