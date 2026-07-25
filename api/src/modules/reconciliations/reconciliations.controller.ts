import { Controller, Get, Body, NotFoundException, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { moneyFromPgNumeric, type ApiResponse } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { SubmitReconciliationDto } from './dto/submit-reconciliation.dto';
import type { ExpectedCashSummary, ReconciliationRow } from './reconciliation.types';
import { ReconciliationsRepository } from './reconciliations.repository';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('reconciliations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired Bearer token' })
@Controller('reconciliations')
@UseGuards(AuthGuard)
export class ReconciliationsController {
  constructor(private readonly reconciliationsRepository: ReconciliationsRepository) {}

  @Get('expected-cash')
  async getExpectedCash(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
  ): Promise<ApiResponse<ExpectedCashSummary>> {
    if (!DATE_PATTERN.test(date ?? '')) {
      throw new BadRequestException('date query param must be an ISO date like "2026-07-24"');
    }
    const summary = await this.reconciliationsRepository.getExpectedCash(user.shopId, date);
    return { success: true, data: summary };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<ApiResponse<ReconciliationRow[]>> {
    const rows = await this.reconciliationsRepository.findAll(user.shopId);
    return { success: true, data: rows };
  }

  @ApiNotFoundResponse({ description: 'No reconciliation submitted for this date' })
  @Get(':date')
  async findByDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ): Promise<ApiResponse<ReconciliationRow>> {
    if (!DATE_PATTERN.test(date)) {
      throw new BadRequestException('date must be an ISO date like "2026-07-24"');
    }
    const row = await this.reconciliationsRepository.findByDate(user.shopId, date);
    if (!row) {
      throw new NotFoundException(`No reconciliation submitted for ${date}`);
    }
    return { success: true, data: row };
  }

  @ApiConflictResponse({ description: 'A reconciliation was already submitted for this date and cannot be resubmitted' })
  @Post()
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitReconciliationDto,
  ): Promise<ApiResponse<ReconciliationRow>> {
    const row = await this.reconciliationsRepository.submit(
      user.shopId,
      user.id,
      dto.businessDate,
      moneyFromPgNumeric(dto.countedCash),
      dto.notes ?? null,
    );
    return { success: true, data: row };
  }
}
