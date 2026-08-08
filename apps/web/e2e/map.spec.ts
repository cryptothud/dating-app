import { test, expect } from '@playwright/test'
import { dismissAgeGate, enterAnonymously } from './helpers'

test.describe('Map page — age gate', () => {
  test('anonymous visitors are asked to verify their age', async ({ page }) => {
    await enterAnonymously(page)
    await expect(page.getByRole('heading', { name: /age verification/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('age gate offers continue and go-back actions', async ({ page }) => {
    await enterAnonymously(page)
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible({ timeout: 8_000 })
  })

  test('continue stays disabled until a date of birth is entered', async ({ page }) => {
    await enterAnonymously(page)
    await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  test('visiting the map directly returns an unverified visitor to the landing page', async ({
    page,
  }) => {
    await page.goto('/map')
    await page.waitForURL('**/', { timeout: 8_000 })
    expect(page.url()).toMatch(/localhost:3000\/$/)
  })
})

test.describe('Map page — anonymous', () => {
  test.beforeEach(async ({ page }) => {
    await dismissAgeGate(page)
  })

  test('map renders once the age gate is cleared', async ({ page }) => {
    // MapLibre draws into a canvas
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('chat FAB is visible on the map', async ({ page }) => {
    await expect(page.getByRole('button', { name: /chat/i }).first()).toBeVisible({
      timeout: 8_000,
    })
  })

  test('chat panel prompts anonymous users to sign up rather than posting', async ({ page }) => {
    await page.getByRole('button', { name: /chat/i }).first().click()
    // Reading global chat is open to everyone; posting requires an account.
    await expect(page.getByRole('button', { name: /sign up to chat/i })).toBeVisible({
      timeout: 5_000,
    })
    await expect(page.getByPlaceholder(/post a message/i)).toBeHidden()
  })

  test('Join link in nav for anonymous users', async ({ page }) => {
    await expect(page.getByRole('link', { name: /join/i }).first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Map page — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissAgeGate(page)
  })

  test('header shows CRUSH wordmark', async ({ page }) => {
    await expect(page.getByText('CRUSH').first()).toBeVisible()
  })

  test('hamburger menu opens', async ({ page }) => {
    await page.getByRole('button', { name: /open menu/i }).click()
    await expect(page.getByRole('link', { name: /terms/i }).first()).toBeVisible({ timeout: 3_000 })
  })

  test('bottom nav links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /map/i }).first()).toBeVisible()
  })

  test('dark/light mode toggle exists', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /theme|dark|light|toggle/i }).first(),
    ).toBeVisible()
  })
})
