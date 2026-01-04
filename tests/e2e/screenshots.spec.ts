import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const screenshotsDir = path.join(process.cwd(), 'screenshots')

test.beforeAll(async () => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }
})

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
]

// Public pages that don't require authentication
test.describe('Public Page Screenshots', () => {
  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test('Home page', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: path.join(screenshotsDir, `home-${viewport.name}.png`),
          fullPage: true,
        })
      })

      test('Login page', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: path.join(screenshotsDir, `login-${viewport.name}.png`),
          fullPage: true,
        })
      })

      test('Registration page', async ({ page }) => {
        await page.goto('/register')
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: path.join(screenshotsDir, `register-${viewport.name}.png`),
          fullPage: true,
        })
      })
    })
  }
})

// Authenticated pages - uses stored auth state from auth.setup.ts
test.describe('Game Page Screenshots (Authenticated)', () => {
  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test('Game lobby', async ({ page }) => {
        await page.goto('/game')
        // Wait for the page to load - lobby should show while waiting for players
        await page.waitForLoadState('networkidle')
        // Give time for WebSocket connection and initial state
        await page.waitForTimeout(2000)
        await page.screenshot({
          path: path.join(screenshotsDir, `game-lobby-${viewport.name}.png`),
          fullPage: true,
        })
      })
    })
  }
})
