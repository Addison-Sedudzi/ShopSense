import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { moneyFromPgNumeric, type ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toProductResponse, type ProductResponse } from './product.types';
import type { CreateProductInput, UpdateProductInput } from './products.repository';
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

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ): Promise<ApiResponse<ProductResponse>> {
    const input: CreateProductInput = {
      name: dto.name,
      sku: dto.sku ?? null,
      categoryId: dto.categoryId ?? null,
      supplierId: dto.supplierId ?? null,
      unit: dto.unit,
      unitsPerCarton: dto.unitsPerCarton ?? null,
      costPrice: moneyFromPgNumeric(dto.costPrice),
      sellingPrice: moneyFromPgNumeric(dto.sellingPrice),
      reorderThreshold: dto.reorderThreshold ?? 0,
    };
    const row = await this.productsRepository.create(user.shopId, input);
    return { success: true, data: toProductResponse(row) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ApiResponse<ProductResponse>> {
    const input: UpdateProductInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.sku !== undefined && { sku: dto.sku }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
      ...(dto.unit !== undefined && { unit: dto.unit }),
      ...(dto.unitsPerCarton !== undefined && { unitsPerCarton: dto.unitsPerCarton }),
      ...(dto.costPrice !== undefined && { costPrice: moneyFromPgNumeric(dto.costPrice) }),
      ...(dto.sellingPrice !== undefined && {
        sellingPrice: moneyFromPgNumeric(dto.sellingPrice),
      }),
      ...(dto.reorderThreshold !== undefined && { reorderThreshold: dto.reorderThreshold }),
    };
    const row = await this.productsRepository.update(user.shopId, id, input);
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, data: toProductResponse(row) };
  }

  @Post(':id/archive')
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ archived: true }>> {
    const archived = await this.productsRepository.archive(user.shopId, id);
    if (!archived) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, data: { archived: true } };
  }
}
