import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Test user credentials (created by seed script)
  const testEmail = 'test@example.com'
  const testPassword = 'TestPassword123!'

  // Go to login page
  await page.goto('/login')

  // Fill in login form
  await page.fill('input[name="email"], input[type="email"]', testEmail)
  await page.fill('input[name="password"], input[type="password"]', testPassword)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for redirect to game page (indicates successful login)
  await page.waitForURL('/game**', { timeout: 10000 })

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
