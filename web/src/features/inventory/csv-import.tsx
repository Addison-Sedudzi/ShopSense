import Papa from 'papaparse';
import { useState } from 'react';
import { productFormSchema, type ProductFormValues } from './product-schema';
import { useCreateProduct } from './use-product-mutations';

interface RowError {
  row: number;
  message: string;
}

interface ImportState {
  validRows: ProductFormValues[];
  errors: RowError[];
}

type ImportResult = { created: number; failed: RowError[] };

/**
 * worker: true runs Papa's parsing in a Web Worker it manages internally
 * (no separate worker file to write or bundle) — the actual answer to "parse
 * a large CSV without freezing the UI": the main thread stays free for
 * clicks/scrolling/React rendering while parsing happens off it entirely,
 * rather than a manual chunk-and-yield loop still competing for the same
 * thread as everything else.
 */
function parseCsv(file: File): Promise<Papa.ParseResult<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: resolve,
      error: reject,
    });
  });
}

function validateRows(rows: Record<string, string>[]): ImportState {
  const validRows: ProductFormValues[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, index) => {
    const result = productFormSchema.safeParse({
      name: raw.name,
      sku: raw.sku,
      unit: raw.unit,
      unitsPerCarton: raw.unitsPerCarton,
      costPrice: raw.costPrice,
      sellingPrice: raw.sellingPrice,
      reorderThreshold: raw.reorderThreshold,
    });
    if (result.success) {
      validRows.push(result.data);
    } else {
      const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      errors.push({ row: index + 2, message }); // +2: 1-indexed, plus the header row
    }
  });

  return { validRows, errors };
}

export function CsvImport({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<ImportState | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const createProduct = useCreateProduct();

  async function handleFile(file: File) {
    setResult(null);
    const parsed = await parseCsv(file);
    setState(validateRows(parsed.data));
  }

  // Sequential, not parallel: there is no bulk-create endpoint, so this is N
  // requests either way, and going one at a time gives an honest per-row
  // report (which rows actually failed server-side, e.g. a duplicate SKU)
  // instead of an unordered flood of concurrent responses to reconcile.
  async function runImport() {
    if (!state) return;
    setIsImporting(true);
    let created = 0;
    const failed: RowError[] = [];
    for (let i = 0; i < state.validRows.length; i++) {
      const row = state.validRows[i];
      try {
        await createProduct.mutateAsync({
          name: row.name,
          sku: row.sku || null,
          unit: row.unit,
          unitsPerCarton: row.unitsPerCarton ? Number(row.unitsPerCarton) : null,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          reorderThreshold: row.reorderThreshold ? Number(row.reorderThreshold) : 0,
        });
        created++;
      } catch {
        failed.push({ row: i + 2, message: `Could not create "${row.name}" — check for a duplicate SKU.` });
      }
    }
    setIsImporting(false);
    setResult({ created, failed });
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-ink-900">Import products from CSV</h2>
      <p className="mt-1 text-sm text-ink-500">
        Columns: name, sku, unit (piece/carton), unitsPerCarton, costPrice, sellingPrice, reorderThreshold
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="mt-3 block w-full text-sm text-ink-700"
      />

      {state && !result && (
        <div className="mt-4">
          <p className="text-sm text-ink-900">
            {state.validRows.length} row{state.validRows.length === 1 ? '' : 's'} ready to import
            {state.errors.length > 0 && `, ${state.errors.length} with errors`}
          </p>

          {state.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {state.errors.map((error) => (
                <li key={error.row}>
                  Row {error.row}: {error.message}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled={state.validRows.length === 0 || isImporting}
            onClick={() => void runImport()}
            className="mt-3 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
          >
            {isImporting ? 'Importing…' : `Import ${state.validRows.length} product${state.validRows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-sm text-ink-900">
            Created {result.created} product{result.created === 1 ? '' : 's'}
            {result.failed.length > 0 && `, ${result.failed.length} failed`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 space-y-1 rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {result.failed.map((error) => (
                <li key={error.row}>
                  Row {error.row}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-4 h-touch w-full rounded-md border border-border text-base font-medium text-ink-900"
      >
        Done
      </button>
    </div>
  );
}
