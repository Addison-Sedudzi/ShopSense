import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { moneyFromPgNumeric, type ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../../auth/auth.guard';
import { CurrentUser } from '../../../auth/current-user.decorator';
import { ProductsRepository } from '../products.repository';
import { convertToBaseUnit } from '../unit-conversion';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { StockMovementsRepository } from './stock-movements.repository';
import type { StockMovementRow } from './stock-movement.types';

@Controller('products/:productId/stock-movements')
@UseGuards(AuthGuard)
export class StockMovementsController {
  constructor(
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ApiResponse<StockMovementRow[]>> {
    const rows = await this.stockMovementsRepository.findByProduct(user.shopId, productId);
    return { success: true, data: rows };
  }

  @Post('receive')
  async receive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReceiveStockDto,
  ): Promise<ApiResponse<StockMovementRow>> {
    const product = await this.productsRepository.findById(user.shopId, productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const quantityDelta = convertToBaseUnit(dto.quantity, dto.unit, product);

    const row = await this.stockMovementsRepository.record(user.shopId, {
      productId,
      movementType: 'receipt',
      quantityDelta,
      unitCost: dto.unitCost ? moneyFromPgNumeric(dto.unitCost) : null,
      reason: null,
      recordedBy: user.id,
    });
    return { success: true, data: row };
  }

  @Post('adjust')
  async adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<ApiResponse<StockMovementRow>> {
    if (dto.type !== 'adjustment_correction' && dto.quantityDelta > 0) {
      throw new BadRequestException(`${dto.type} must reduce stock (negative quantityDelta)`);
    }

    const row = await this.stockMovementsRepository.record(user.shopId, {
      productId,
      movementType: dto.type,
      quantityDelta: dto.quantityDelta,
      unitCost: null,
      reason: dto.reason,
      recordedBy: user.id,
    });
    return { success: true, data: row };
  }
}
