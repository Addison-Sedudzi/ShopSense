import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'E2E_EMAIL / E2E_PASSWORD are not set. Copy web/.env.e2e.example to web/.env.e2e.local and fill in a real Supabase account.',
    );
  }
});

test('shows the sign-in form when signed out', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('shows an error for invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL!);
  await page.getByLabel('Password').fill('definitely-the-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('form')).toContainText(/invalid/i, { timeout: 10_000 });
  // Still on the login form, not redirected.
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('signs in with valid credentials and lands on the sale terminal', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/', { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Sell' })).toBeVisible();
  // Bottom nav present and pointing at the right section.
  await expect(page.getByRole('link', { name: 'Sell' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();
});
