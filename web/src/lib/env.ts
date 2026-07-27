/**
 * Only three variables belong here: the Supabase URL and anon key (both
 * meant to be public -- the anon key is designed to be embedded in a client
 * bundle, unlike the backend's service-role credentials) and the API base
 * URL. Anything else -- a secret, a signing key, a service-role key -- must
 * never be a VITE_ variable, since Vite inlines every VITE_-prefixed value
 * directly into the shipped JS bundle for anyone to read.
 *
 * Checked once at module load, at the top of the import graph (main.tsx),
 * so a missing variable fails immediately and loudly instead of surfacing
 * as a confusing "fetch failed" deep inside a component months later.
 */
export interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy web/.env.example to web/.env.local.`);
  }
  return value;
}

export const env: Env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  apiBaseUrl: required('VITE_API_BASE_URL'),
};
