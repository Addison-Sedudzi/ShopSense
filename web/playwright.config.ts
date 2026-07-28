import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Node 20.6+ built-in — no dotenv dependency needed. Missing file is fine:
// CI or a machine without real Supabase test credentials just gets clear
// "credentials not set" failures from the specs themselves, not silently
// skipped, since this suite intentionally never mocks the API/Supabase.
try {
  process.loadEnvFile(fileURLToPath(new URL('.env.e2e.local', import.meta.url)));
} catch {
  // no local e2e env file — fall through to whatever's already in process.env
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The dev server (and the API it talks to) are started separately, not by
  // Playwright itself -- this suite hits the real backend and real Supabase
  // project, the same "never mock" infrastructure discipline as the API's
  // own e2e suite, which isn't something `webServer` should spin up blind.
});
