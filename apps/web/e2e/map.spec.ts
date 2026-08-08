import { test, expect } from '@playwright/test'
import { dismissAgeGate } from './helpers'

test.describe('Map page — anonymous', () => {
  test('shows age gate for anonymous users', async ({ page }) => {
    await page.goto('/map')
    // Age gate should appear before the map is visible
    await expect(page.getByText(/18|age|verify/i)).toBeVisible({ timeout: 8_000 })
  })

  test('age gate has confirm and go-back actions', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByRole('button', { name: /i am 18|confirm|yes/i })).toBeVisible({
      timeout: 8_000,
    })
    await expect(page.getByRole('button', { name: /go back|cancel|no/i })).toBeVisible({
      timeout: 8_000,
    })
  })

  test('map renders after age gate is dismissed', async ({ page }) => {
    await page.goto('/map')
    await dismissAgeGate(page)
    await page.reload()
    // MapLibre renders a canvas element
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('chat FAB is visible on the map', async ({ page }) => {
    await page.goto('/map')
    await dismissAgeGate(page)
    await page.reload()
    await expect(page.getByRole('button', { name: /chat/i })).toBeVisible({ timeout: 8_000 })
  })

  test('chat panel opens when FAB is clicked', async ({ page }) => {
    await page.goto('/map')
    await dismissAgeGate(page)
    await page.reload()
    await page.getByRole('button', { name: /chat/i }).click()
    // Chat panel should slide up — look for the send button or input
    await expect(page.getByPlaceholder(/message|say something/i)).toBeVisible({ timeout: 5_000 })
  })

  test('Join link in nav for anonymous users', async ({ page }) => {
    await page.goto('/map')
    await dismissAgeGate(page)
    await page.reload()
    await expect(page.getByRole('link', { name: /join/i })).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Map page — navigation', () => {
  test('header shows CRUSH wordmark', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByText('CRUSH').first()).toBeVisible()
  })

  test('hamburger menu opens', async ({ page }) => {
    await page.goto('/map')
    await page.getByRole('button', { name: /open menu|menu/i }).click()
    await expect(page.getByRole('link', { name: /terms/i })).toBeVisible({ timeout: 3_000 })
  })

  test('bottom nav links are present', async ({ page }) => {
    await page.goto('/map')
    await dismissAgeGate(page)
    await page.reload()
    await expect(page.getByRole('link', { name: /map/i })).toBeVisible()
  })

  test('dark/light mode toggle exists', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByRole('button', { name: /theme|dark|light|toggle/i })).toBeVisible()
  })
})
