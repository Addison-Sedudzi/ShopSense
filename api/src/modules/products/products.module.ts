import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { StockMovementsController } from './stock-movements/stock-movements.controller';
import { StockMovementsRepository } from './stock-movements/stock-movements.repository';

@Module({
  controllers: [ProductsController, StockMovementsController],
  providers: [ProductsRepository, StockMovementsRepository],
})
export class ProductsModule {}
