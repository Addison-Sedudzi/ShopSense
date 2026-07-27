/// <reference types="vite/client" />

// Augments Vite's built-in ImportMetaEnv so a typo or missing variable is a
// compile error at every `import.meta.env.X` call site, not just a runtime
// `undefined`. Actual presence/shape is still checked at runtime in
// src/lib/env.ts, since TypeScript types don't survive into the browser.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
