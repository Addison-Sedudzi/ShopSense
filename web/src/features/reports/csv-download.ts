import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase-client';

/**
 * A plain <a href> can't attach an Authorization header, and every report
 * endpoint requires one — so the CSV has to be fetched the same way any
 * other authenticated request is, then handed to the browser as a Blob
 * object URL to trigger the actual download.
 */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Could not download ${filename}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
