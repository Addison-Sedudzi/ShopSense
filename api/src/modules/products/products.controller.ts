import { Controller, Get, UseGuards } from '@nestjs/common';
import type { ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { toProductResponse, type ProductResponse } from './product.types';
import { ProductsRepository } from './products.repository';

@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly productsRepository: ProductsRepository) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<ApiResponse<ProductResponse[]>> {
    const rows = await this.productsRepository.findByShop(user.shopId);
    return { success: true, data: rows.map(toProductResponse) };
  }
}
