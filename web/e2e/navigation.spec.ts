import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/', { timeout: 10_000 });
}

const ROUTES: { path: string; heading: string; nav: string }[] = [
  { path: '/', heading: 'Sell', nav: 'Sell' },
  { path: '/inventory', heading: 'Inventory', nav: 'Inventory' },
  { path: '/reconciliation', heading: 'Reconciliation', nav: 'Reconcile' },
  { path: '/reports', heading: 'Reports', nav: 'Reports' },
  { path: '/settings', heading: 'Settings', nav: 'Settings' },
];

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'E2E_EMAIL / E2E_PASSWORD are not set. Copy web/.env.e2e.example to web/.env.e2e.local and fill in a real Supabase account.',
    );
  }
});

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

for (const route of ROUTES) {
  test(`${route.path} renders its "${route.heading}" heading with no console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.getByRole('link', { name: route.nav }).click();
    await expect(page).toHaveURL(route.path === '/' ? '/' : route.path);
    await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible({ timeout: 10_000 });

    expect(consoleErrors, `console errors on ${route.path}: ${consoleErrors.join('; ')}`).toEqual([]);
  });
}

test('bottom nav highlights the active section', async ({ page }) => {
  await page.getByRole('link', { name: 'Inventory' }).click();
  await expect(page.getByRole('link', { name: 'Inventory' })).toHaveClass(/text-brand-600/);
  await expect(page.getByRole('link', { name: 'Sell' })).not.toHaveClass(/text-brand-600/);
});
