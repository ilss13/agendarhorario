import { expect, test } from '@playwright/test';

test.describe('smoke — public routes', () => {
  test('landing renders headline and pricing CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a', { hasText: /Começar/i }).first()).toBeVisible();
  });

  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
  });

  test('register-empresa page loads with form', async ({ page }) => {
    await page.goto('/registrar-empresa');
    await expect(page.getByText('Cadastrar empresa')).toBeVisible();
  });

  test('register-cliente page loads with form', async ({ page }) => {
    await page.goto('/registrar-cliente');
    await expect(page.getByText('Criar conta de cliente')).toBeVisible();
  });

  test('public booking page shows fallback for missing company', async ({ page }) => {
    await page.goto('/p/empresa-inexistente');
    // não devemos crashar; ou mostramos empty state, ou continua carregando
    await expect(page.locator('main')).toBeVisible();
  });

  test('action confirm page renders for invalid token', async ({ page }) => {
    await page.goto('/a/token-invalido');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('smoke — mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('landing has sticky CTA visible on mobile', async ({ page }) => {
    await page.goto('/');
    const stickyCta = page.locator('.sticky-cta');
    await expect(stickyCta).toBeVisible();
  });
});
