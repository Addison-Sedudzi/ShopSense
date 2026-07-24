import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ProductRankMetric, ProductRankOrder } from '../report.types';
import { DateRangeQueryDto } from './date-range.dto';

export class ProductRankingQueryDto extends DateRangeQueryDto {
  @IsIn(['quantity', 'revenue'])
  metric!: ProductRankMetric;

  @IsIn(['top', 'bottom'])
  order!: ProductRankOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
