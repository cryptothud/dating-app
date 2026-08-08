import type { Page } from '@playwright/test'

export const TEST_USER = {
  email: `e2e+${Date.now()}@crush-test.invalid`,
  password: 'TestPass1!',
  phone: '+15550001234',
}

/**
 * Enter /map the way an anonymous visitor does: the landing page sets an intent flag, and
 * the app layout shows the age gate only when it is present. Navigating to /map directly
 * without it redirects straight back to the landing page.
 */
export async function enterAnonymously(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => sessionStorage.setItem('crush_anon_intent', '1'))
  await page.goto('/map')
}

/**
 * Skip the age gate by setting the flag it checks, then load the map.
 *
 * The navigation happens here rather than via reload() in the caller: an anonymous visitor
 * on /map is redirected to /, so a reload would race that redirect and sometimes reload the
 * landing page instead of the map.
 */
export async function dismissAgeGate(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => sessionStorage.setItem('crush_age_verified', '1'))
  await page.goto('/map')
}

export async function signupAndVerify(page: Page, user = TEST_USER): Promise<void> {
  await page.goto('/signup')

  // Step one: date of birth. The year wheel already defaults to an adult year.
  await page.getByLabel(/birth month/i).selectOption('6')
  await page.getByLabel(/birth day/i).selectOption('15')
  await page.getByRole('button', { name: /continue/i }).click()

  // Step two: account details.
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/phone/i).fill(user.phone)
  await page.getByLabel(/^password$/i).fill(user.password)

  await page.getByRole('button', { name: /create account|sign up/i }).click()
}

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL('**/map', { timeout: 10_000 })
}
