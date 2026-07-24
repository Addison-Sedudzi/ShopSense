import { Readable } from 'stream';
import type { Response } from 'express';

export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function* csvLines<T extends object>(rows: T[], columns: CsvColumn<T>[]): Generator<string> {
  yield columns.map((c) => csvEscape(c.header)).join(',') + '\n';
  for (const row of rows) {
    yield columns.map((c) => csvEscape(row[c.key])).join(',') + '\n';
  }
}

/**
 * Writes CSV a line at a time via a Readable generator stream rather than
 * building the whole file as one string in memory first. The underlying
 * query already returns an aggregated (small) result set for every report
 * here, so the memory saving is modest today, but it's the same pattern
 * that matters once a report stops being pre-aggregated.
 */
export function streamCsv<T extends object>(
  res: Response,
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  Readable.from(csvLines(rows, columns)).pipe(res);
}
