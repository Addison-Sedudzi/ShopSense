import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { ApiResponse } from '@shopsense/shared';
import { toProductResponse, type ProductResponse } from './product.types';
import { ProductsRepository } from './products.repository';

@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsRepository: ProductsRepository) {}

  @Get()
  async findAll(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<ApiResponse<ProductResponse[]>> {
    const rows = await this.productsRepository.findByShop(shopId);
    return { success: true, data: rows.map(toProductResponse) };
  }
}
