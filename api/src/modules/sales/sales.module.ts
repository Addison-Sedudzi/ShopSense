import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesRepository } from './sales.repository';

@Module({
  controllers: [SalesController],
  providers: [SalesRepository],
})
export class SalesModule {}
