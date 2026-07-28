import { useState } from 'react';
import { downloadCsv } from './csv-download';

export function CsvExportButton({ path, filename }: { path: string; filename: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setIsDownloading(true);
    setError(false);
    try {
      await downloadCsv(path, filename);
    } catch {
      setError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDownloading}
      className="h-touch rounded-md border border-border px-3 text-sm font-medium text-ink-700 disabled:opacity-50"
    >
      {isDownloading ? 'Exporting…' : error ? 'Retry export' : 'Export CSV'}
    </button>
  );
}
