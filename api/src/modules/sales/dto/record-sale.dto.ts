import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ProductUnit } from '../../products/product.types';
import { DiscountDto } from './discount.dto';

// Deliberately no unitPrice, no lineSubtotal, no total anywhere in this DTO.
// Every money figure in a sale is computed server-side from the live product
// price at the moment of sale — a client-supplied total would mean the server
// trusts the browser to do its own arithmetic honestly, which is exactly what
// a POS cannot do.
export class SaleItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsIn(['piece', 'carton'])
  unit!: ProductUnit;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;
}

export class RecordSaleDto {
  // Client-generated, stable across retries of the same logical sale (e.g. an
  // offline sale replayed after reconnecting) so the unique index on
  // (shop_id, idempotency_key) can catch a duplicate before it's ever written twice.
  @MinLength(1)
  idempotencyKey!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  saleDiscount?: DiscountDto;
}
