import { IsIn, IsOptional, Matches } from 'class-validator';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class DateRangeQueryDto {
  @Matches(DATE_PATTERN, { message: 'from must be an ISO date like "2026-07-01"' })
  from!: string;

  @Matches(DATE_PATTERN, { message: 'to must be an ISO date like "2026-07-31"' })
  to!: string;

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';
}
