import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RecordSaleDto } from './dto/record-sale.dto';
import type { SaleRow } from './sale.types';
import { SalesRepository } from './sales.repository';

@ApiTags('sales')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired Bearer token' })
@Controller('sales')
@UseGuards(AuthGuard)
export class SalesController {
  constructor(private readonly salesRepository: SalesRepository) {}

  @ApiConflictResponse({ description: 'A line item requests more than the current stock on hand' })
  @ApiNotFoundResponse({ description: 'A line item references a product not in your shop' })
  @Post()
  async record(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordSaleDto,
  ): Promise<ApiResponse<SaleRow>> {
    const sale = await this.salesRepository.record(user.shopId, user.id, {
      idempotencyKey: dto.idempotencyKey,
      items: dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        discount: item.discount,
      })),
      saleDiscount: dto.saleDiscount,
    });
    return { success: true, data: sale };
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<SaleRow>> {
    const sale = await this.salesRepository.findById(user.shopId, id);
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return { success: true, data: sale };
  }
}
