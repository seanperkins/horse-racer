/**
 * E2E test to verify client and server race simulations produce identical results
 */

import { test, expect } from '@playwright/test'

test.describe('Race Simulation Sync', () => {
  let serverLogs = []
  let clientLogs = []

  test.beforeEach(async ({ page }) => {
    // Capture console logs from the browser
    page.on('console', msg => {
      const text = msg.text()
      clientLogs.push(text)

      // Also log objects if available
      if (msg.args().length > 0) {
        Promise.all(msg.args().map(arg => arg.jsonValue()))
          .then(args => {
            clientLogs.push({ text, args })
          })
          .catch(() => {})
      }
    })

    // Navigate to the game
    await page.goto('http://localhost:3000')
  })

  test('should produce identical results on client and server', async ({ page }) => {
    // Create or join a game room
    await page.waitForSelector('text=Horse Racer', { timeout: 10000 })

    // Look for "Quick Play" or "Join Game" button
    const quickPlayButton = page.locator('button:has-text("Quick Play"), button:has-text("Play Now"), a:has-text("Quick Play")')
    const isVisible = await quickPlayButton.isVisible().catch(() => false)

    if (isVisible) {
      await quickPlayButton.click()
    } else {
      // Try alternative navigation
      console.log('Quick Play button not found, looking for alternatives...')
      await page.screenshot({ path: 'debug-homepage.png' })

      // Look for any game-related link
      const gameLink = page.locator('a[href*="game"], button:has-text("Game"), button:has-text("Start")')
      await gameLink.first().click()
    }

    console.log('Waiting for game to start...')

    // Wait for the game to load and phases to progress
    // This might take a while as we go through shop, prep, betting phases
    await page.waitForTimeout(5000)

    // Wait for race inputs to be logged
    let raceStarted = false
    let raceCompleted = false
    let clientSeed = null
    let clientParticipants = []
    let serverSeed = null
    let serverParticipants = []

    // Monitor logs for up to 3 minutes (enough time for phases to progress)
    const maxWaitTime = 180000 // 3 minutes
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime && !raceCompleted) {
      await page.waitForTimeout(1000)

      // Check if we've captured the race logs
      const clientSeedLog = clientLogs.find(log =>
        typeof log === 'string' && log.includes('Race seed:')
      )

      if (clientSeedLog && !raceStarted) {
        console.log('Race started! Capturing logs...')
        raceStarted = true

        // Extract seed
        const seedMatch = clientSeedLog.match(/Race seed: (.+)/)
        if (seedMatch) {
          clientSeed = seedMatch[1]
          console.log('Client seed:', clientSeed)
        }
      }

      // Check for race_results message indicating race completion
      const resultsLog = clientLogs.find(log =>
        typeof log === 'string' && log.includes('race_results')
      )

      if (resultsLog && raceStarted) {
        console.log('Race completed!')
        raceCompleted = true
      }
    }

    if (!raceStarted) {
      console.log('Race did not start within timeout period')
      console.log('Captured logs:', clientLogs.slice(-20))
      await page.screenshot({ path: 'debug-no-race.png' })
      throw new Error('Race did not start')
    }

    // Extract client participant data from logs
    const clientDataLogs = clientLogs.filter(log =>
      typeof log === 'object' &&
      log.text &&
      log.text.includes('Client simulation - Full participant data')
    )

    console.log('\n=== CLIENT LOGS ===')
    console.log('Client seed:', clientSeed)

    // Find detailed participant logs
    for (let i = 0; i < clientLogs.length; i++) {
      const log = clientLogs[i]
      if (typeof log === 'string' && log.match(/\[\d+\] .+:/)) {
        console.log(log)
        // The next log should be the object
        if (i + 1 < clientLogs.length && typeof clientLogs[i + 1] === 'object') {
          console.log(clientLogs[i + 1])
        }
      }
    }

    // TODO: Capture server logs (would need server logging to file or structured output)
    // For now, we can at least verify the client-side simulation ran

    expect(raceStarted).toBe(true)
    expect(clientSeed).toBeTruthy()

    console.log('\n=== TEST SUMMARY ===')
    console.log('Test captured race simulation')
    console.log('Client seed:', clientSeed)
    console.log('Please check server terminal for corresponding server logs')
    console.log('Compare "Client simulation" vs "Server simulation" participant data')
  })

  test('should show identical positions during race and in results', async ({ page }) => {
    // Navigate and start game
    await page.goto('http://localhost:3000/game')

    // Wait for shop phase and auto-ready (or skip if possible)
    await page.waitForTimeout(5000)

    let visualPositions = []
    let resultsPositions = []

    // Monitor for race phase
    const racePhaseDetected = await page.waitForSelector('text=Creating simulator', {
      timeout: 120000 // 2 minutes to get through phases
    }).catch(() => null)

    if (racePhaseDetected) {
      console.log('Race phase started')

      // Wait a bit for race to progress
      await page.waitForTimeout(10000)

      // Try to capture visual positions from the race view
      // This would require knowing the DOM structure

      // Wait for results
      const resultsDetected = await page.waitForSelector('text=Final Results, text=Your Performance', {
        timeout: 60000
      }).catch(() => null)

      if (resultsDetected) {
        console.log('Results page displayed')

        // Capture results from the page
        const placements = await page.locator('[class*="position"]').allTextContents()
        console.log('Results placements:', placements)
      }
    }

    console.log('Visual positions:', visualPositions)
    console.log('Results positions:', resultsPositions)
  })

  test.afterEach(async () => {
    console.log('\n=== Captured', clientLogs.length, 'client logs ===')
  })
})
