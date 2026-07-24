import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { DailyBriefing } from './briefing/briefing.types';
import { DailyBriefingRepository } from './briefing/briefing.repository';
import type { RestockRecommendation } from './restock/restock.types';
import { RestockRecommendationsRepository } from './restock/restock.repository';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Controller('intelligence')
@UseGuards(AuthGuard)
export class IntelligenceController {
  constructor(
    private readonly restockRepository: RestockRecommendationsRepository,
    private readonly briefingRepository: DailyBriefingRepository,
  ) {}

  @Get('restock-recommendations')
  async restockRecommendations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<RestockRecommendation[]>> {
    const data = await this.restockRepository.getRecommendations(user.shopId);
    return { success: true, data };
  }

  @Get('daily-briefing')
  async dailyBriefing(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
  ): Promise<ApiResponse<DailyBriefing>> {
    if (!DATE_PATTERN.test(date ?? '')) {
      throw new BadRequestException('date query param must be an ISO date like "2026-07-24"');
    }
    const data = await this.briefingRepository.getBriefing(user.shopId, date);
    return { success: true, data };
  }
}
