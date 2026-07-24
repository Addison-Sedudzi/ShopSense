import { Module } from '@nestjs/common';
import { ReconciliationsController } from './reconciliations.controller';
import { ReconciliationsRepository } from './reconciliations.repository';

@Module({
  controllers: [ReconciliationsController],
  providers: [ReconciliationsRepository],
})
export class ReconciliationsModule {}
