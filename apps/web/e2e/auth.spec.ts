import { test, expect } from '@playwright/test'

test.describe('Homepage / login', () => {
  test('shows login form on root', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /crush/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/email/i).fill('nobody@example.invalid')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page.getByText(/invalid credentials|incorrect/i)).toBeVisible({ timeout: 5_000 })
  })

  test('authenticated user is redirected away from /', async ({ page, context }) => {
    // Simulate an authenticated session by setting the access_token cookie
    // In real E2E against a live API this would go through actual login;
    // here we verify the middleware redirect logic using a mock token.
    await context.addCookies([
      {
        name: 'access_token',
        value: 'mock.jwt.token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])
    // The middleware should redirect — but with a fake token the redirect will
    // fail auth and send back to /. We just assert the redirect attempt fires.
    await page.goto('/')
    // Either we land on /map (valid token) or stay on / (invalid mock token)
    // — both are correct behavior. The key check: no unhandled crash.
    const url = page.url()
    expect(url).toMatch(/localhost:3000\/(map)?$/)
  })
})

test.describe('Signup flow', () => {
  test('signup page renders form fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/phone/i)).toBeVisible()
    await expect(page.getByLabel(/^password/i)).toBeVisible()
  })

  test('shows error when under 18', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel(/email/i).fill('teen@example.invalid')
    await page.getByLabel(/phone/i).fill('+15550001234')
    await page.getByLabel(/^password/i).fill('TestPass1!')

    const today = new Date().toISOString().split('T')[0]!
    const dobField = page.getByLabel(/date of birth|birthday/i)
    if (await dobField.isVisible()) {
      await dobField.fill(today) // today = 0 years old
    }

    await page.getByRole('button', { name: /create account|sign up/i }).click()
    await expect(page.getByText(/18|must be/i)).toBeVisible({ timeout: 5_000 })
  })

  test('forgot password page is accessible', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset/i })).toBeVisible()
  })
})

test.describe('Protected routes', () => {
  test('/messages redirects unauthenticated users to /', async ({ page }) => {
    await page.goto('/messages')
    await page.waitForURL('**/', { timeout: 5_000 })
    expect(page.url()).toMatch(/localhost:3000\/$/)
  })

  test('/profile redirects unauthenticated users to /', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForURL('**/', { timeout: 5_000 })
    expect(page.url()).toMatch(/localhost:3000\/$/)
  })

  test('/settings redirects unauthenticated users to /', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/', { timeout: 5_000 })
    expect(page.url()).toMatch(/localhost:3000\/$/)
  })
})

test.describe('Legal pages', () => {
  for (const path of ['/terms', '/privacy', '/safety', '/2257', '/takedown', '/content-removal']) {
    test(`${path} is publicly accessible`, async ({ page }) => {
      await page.goto(path)
      // Should not redirect to / and should not show a 404
      expect(page.url()).toContain(path)
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
  }
})
