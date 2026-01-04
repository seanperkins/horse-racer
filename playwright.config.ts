import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, 'playwright/.auth/user.json')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main chromium tests
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Screenshots project - depends on setup for auth
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
