import { Module } from '@nestjs/common';
import { DailyBriefingRepository } from './briefing/briefing.repository';
import { ClaudeService } from './claude.service';
import { IntelligenceCache } from './intelligence-cache.service';
import { IntelligenceController } from './intelligence.controller';
import { RestockRecommendationsRepository } from './restock/restock.repository';

@Module({
  controllers: [IntelligenceController],
  providers: [ClaudeService, IntelligenceCache, RestockRecommendationsRepository, DailyBriefingRepository],
})
export class IntelligenceModule {}
