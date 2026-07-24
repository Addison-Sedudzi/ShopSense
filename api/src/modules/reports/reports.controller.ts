import { BadRequestException, Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { moneyToPgNumeric, type ApiResponse, type Money } from '@shopsense/shared';
import type { Response } from 'express';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import type { CsvColumn } from './csv-stream';
import { streamCsv } from './csv-stream';
import { DateRangeQueryDto } from './dto/date-range.dto';
import { ProductRankingQueryDto } from './dto/product-ranking-query.dto';
import type {
  CategoryMargin,
  DailySalesSummary,
  DiscountImpactReport,
  ProductMargin,
  ProductRanking,
  StockValuationReport,
} from './report.types';
import { ReportsRepository } from './reports.repository';

function assertValidRange(from: string, to: string): void {
  if (from > to) {
    throw new BadRequestException('from must not be after to');
  }
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  @Get('sales-summary')
  async salesSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    assertValidRange(query.from, query.to);
    const rows = await this.reportsRepository.salesSummary(user.shopId, query.from, query.to);

    if (this.wantsCsv(res)) {
      const columns: CsvColumn<DailySalesSummary>[] = [
        { key: 'day', header: 'Day' },
        { key: 'saleCount', header: 'Sale Count' },
        { key: 'subtotal', header: 'Subtotal' },
        { key: 'discountTotal', header: 'Discount Total' },
        { key: 'grandTotal', header: 'Grand Total' },
      ];
      streamCsv(res, 'sales-summary.csv', columns, rows.map(this.toCsvRow(['subtotal', 'discountTotal', 'grandTotal'])));
      return;
    }
    this.sendJson(res, rows);
  }

  @Get('product-ranking')
  async productRanking(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductRankingQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    assertValidRange(query.from, query.to);
    const rows = await this.reportsRepository.productRanking(
      user.shopId,
      query.from,
      query.to,
      query.metric,
      query.order,
      query.limit ?? 10,
    );

    if (this.wantsCsv(res)) {
      const columns: CsvColumn<ProductRanking>[] = [
        { key: 'productId', header: 'Product ID' },
        { key: 'productName', header: 'Product Name' },
        { key: 'totalQuantity', header: 'Total Quantity' },
        { key: 'totalRevenue', header: 'Total Revenue' },
      ];
      streamCsv(res, 'product-ranking.csv', columns, rows.map(this.toCsvRow(['totalRevenue'])));
      return;
    }
    this.sendJson(res, rows);
  }

  @Get('margin-by-product')
  async marginByProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    assertValidRange(query.from, query.to);
    const rows = await this.reportsRepository.marginByProduct(user.shopId, query.from, query.to);

    if (this.wantsCsv(res)) {
      const columns: CsvColumn<ProductMargin>[] = [
        { key: 'productId', header: 'Product ID' },
        { key: 'productName', header: 'Product Name' },
        { key: 'revenue', header: 'Revenue' },
        { key: 'cost', header: 'Cost' },
        { key: 'margin', header: 'Margin' },
      ];
      streamCsv(res, 'margin-by-product.csv', columns, rows.map(this.toCsvRow(['revenue', 'cost', 'margin'])));
      return;
    }
    this.sendJson(res, rows);
  }

  @Get('margin-by-category')
  async marginByCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    assertValidRange(query.from, query.to);
    const rows = await this.reportsRepository.marginByCategory(user.shopId, query.from, query.to);

    if (this.wantsCsv(res)) {
      const columns: CsvColumn<CategoryMargin>[] = [
        { key: 'categoryName', header: 'Category' },
        { key: 'revenue', header: 'Revenue' },
        { key: 'cost', header: 'Cost' },
        { key: 'margin', header: 'Margin' },
      ];
      streamCsv(res, 'margin-by-category.csv', columns, rows.map(this.toCsvRow(['revenue', 'cost', 'margin'])));
      return;
    }
    this.sendJson(res, rows);
  }

  @Get('stock-valuation')
  async stockValuation(
    @CurrentUser() user: AuthenticatedUser,
    @Query('format') format: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const report = await this.reportsRepository.stockValuation(user.shopId);

    if (format === 'csv') {
      const columns: CsvColumn<StockValuationReport['lines'][number]>[] = [
        { key: 'productId', header: 'Product ID' },
        { key: 'productName', header: 'Product Name' },
        { key: 'currentStock', header: 'Current Stock' },
        { key: 'costPrice', header: 'Cost Price' },
        { key: 'sellingPrice', header: 'Selling Price' },
        { key: 'valueAtCost', header: 'Value At Cost' },
        { key: 'valueAtRetail', header: 'Value At Retail' },
      ];
      streamCsv(
        res,
        'stock-valuation.csv',
        columns,
        report.lines.map(this.toCsvRow(['costPrice', 'sellingPrice', 'valueAtCost', 'valueAtRetail'])),
      );
      return;
    }
    this.sendJson(res, report);
  }

  @Get('discount-impact')
  async discountImpact(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeQueryDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    assertValidRange(query.from, query.to);
    const report = await this.reportsRepository.discountImpact(user.shopId, query.from, query.to);

    if (this.wantsCsv(res)) {
      const columns: CsvColumn<DiscountImpactReport['lines'][number]>[] = [
        { key: 'discountType', header: 'Discount Type' },
        { key: 'level', header: 'Level' },
        { key: 'discountCount', header: 'Discount Count' },
        { key: 'totalAmount', header: 'Total Amount' },
      ];
      streamCsv(res, 'discount-impact.csv', columns, report.lines.map(this.toCsvRow(['totalAmount'])));
      return;
    }
    this.sendJson(res, report);
  }

  private wantsCsv(res: Response): boolean {
    return res.req.query.format === 'csv';
  }

  private sendJson<T>(res: Response, data: T): void {
    const body: ApiResponse<T> = { success: true, data };
    res.json(body);
  }

  // CSV is for spreadsheets, not the wire format the rest of the API uses:
  // Money values are rendered as plain decimal strings ("18.00") instead of
  // the raw minor-units integer, so they open in Excel/Sheets as real numbers.
  private toCsvRow<T extends object>(moneyKeys: (keyof T)[]) {
    return (row: T): T => {
      const copy = { ...row };
      for (const key of moneyKeys) {
        copy[key] = moneyToPgNumeric(copy[key] as unknown as Money) as unknown as T[typeof key];
      }
      return copy;
    };
  }
}
