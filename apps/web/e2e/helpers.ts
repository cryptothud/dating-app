import type { Page } from '@playwright/test'

export const TEST_USER = {
  email: `e2e+${Date.now()}@crush-test.invalid`,
  password: 'TestPass1!',
  phone: '+15550001234',
}

export async function dismissAgeGate(page: Page): Promise<void> {
  // Set the session storage flag that the age gate checks
  await page.evaluate(() => sessionStorage.setItem('crush_age_verified', '1'))
}

export async function signupAndVerify(page: Page, user = TEST_USER): Promise<void> {
  await page.goto('/signup')

  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/phone/i).fill(user.phone)
  await page.getByLabel(/^password/i).fill(user.password)

  // Date of birth — 25 years ago
  const dob = new Date()
  dob.setFullYear(dob.getFullYear() - 25)
  await page.getByLabel(/date of birth|birthday/i).fill(dob.toISOString().split('T')[0]!)

  await page.getByRole('button', { name: /create account|sign up/i }).click()
}

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL('**/map', { timeout: 10_000 })
}
