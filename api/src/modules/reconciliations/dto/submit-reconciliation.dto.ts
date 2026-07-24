import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class SubmitReconciliationDto {
  @Matches(DATE_PATTERN, { message: 'businessDate must be an ISO date like "2026-07-24"' })
  businessDate!: string;

  @Matches(MONEY_PATTERN, { message: 'countedCash must be a decimal amount like "245.50"' })
  countedCash!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string;
}
