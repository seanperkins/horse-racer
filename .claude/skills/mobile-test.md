# Mobile Responsiveness Tester Skill

Test game UI across mobile devices and screen sizes.

## Usage

```bash
/mobile-test
```

## What This Skill Does

Runs Playwright tests in mobile viewports, validates touch interactions, checks responsive layouts, and generates screenshots for visual review.

## Options

When invoked, you can:
1. **Full Mobile Audit**: Test all pages on all devices
2. **Specific Device**: Test on a single device profile
3. **Specific Page**: Test one page across devices
4. **Touch Interactions**: Validate touch-specific behaviors
5. **Generate Screenshots**: Capture all pages for review

## Device Profiles

### Phones
```
iPhone SE (375×667) - Small phone
iPhone 12/13/14 (390×844) - Standard iPhone
iPhone 12/13/14 Pro Max (428×926) - Large iPhone
Pixel 5 (393×851) - Standard Android
Samsung Galaxy S21 (360×800) - Popular Android
```

### Tablets
```
iPad Mini (768×1024) - Small tablet
iPad (810×1080) - Standard tablet
iPad Pro 11" (834×1194) - Large tablet
iPad Pro 12.9" (1024×1366) - Extra large
```

### Orientations
```
Portrait (default)
Landscape (rotated)
```

## Tests Performed

### 1. Layout Responsiveness
```
- No horizontal overflow/scrolling
- Text remains readable (min 14px)
- Buttons have adequate touch targets (min 44×44px)
- Content doesn't overlap
- Navigation is accessible
```

### 2. Touch Interactions
```
- Tap works on all buttons
- Swipe gestures (if any)
- Long press behaviors
- No hover-dependent features
- Touch feedback visible
```

### 3. Game-Specific Mobile Tests
```
- Shop grid adapts to screen width
- Horse/jockey cards are tappable
- Race visualization scales properly
- Betting buttons are reachable
- Timer and gold display visible
```

### 4. Performance on Mobile
```
- Page load under 3s on 4G
- Smooth scrolling (60fps)
- No jank during race animation
- Memory usage acceptable
```

## Commands

### Run All Mobile Tests
```bash
npx playwright test --project=mobile
```

### Test Specific Device
```bash
npx playwright test --project="iPhone 14"
```

### Generate Screenshot Gallery
```bash
npm run test:mobile:screenshots
```

### Test Touch Interactions
```bash
npx playwright test tests/e2e/mobile-touch.spec.ts
```

## Output Format

```
📱 Mobile Responsiveness Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DEVICE COVERAGE
─────────────────────────────────────────────
Testing 6 device profiles across 5 pages...

iPhone SE (375×667)
  ✓ /login - Layout OK, touch targets OK
  ✓ /game - Layout OK, shop grid 2-col
  ⚠️ /game (betting) - Button overlap detected
  ✓ /tutorial - Scrollable, readable

iPhone 14 (390×844)
  ✓ /login
  ✓ /game
  ✓ /game (betting)
  ✓ /tutorial

iPad (810×1080)
  ✓ /login
  ✓ /game - Shop grid 4-col
  ✓ /game (betting)
  ✓ /tutorial

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 ISSUES FOUND
─────────────────────────────────────────────

1. Button Overlap on iPhone SE (Betting Phase)
   Screenshot: mobile-tests/iphone-se-betting.png
   Issue: "Place Bet" and "Skip" buttons overlap
   Fix: Reduce button width or stack vertically

   CSS Suggestion:
   @media (max-width: 375px) {
     .betting-actions { flex-direction: column; }
   }

2. Touch Target Too Small
   Page: /game (Shop Phase)
   Element: Reroll button
   Size: 32×32px (minimum: 44×44px)
   Fix: Increase button padding

3. Text Truncation
   Page: /game (Race Results)
   Element: Horse names in standings
   Issue: Names cut off on small screens
   Fix: Use ellipsis or reduce font size

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📸 SCREENSHOT GALLERY
─────────────────────────────────────────────
Screenshots saved to: /test-results/mobile/

  mobile/iphone-se/
    ├── login.png
    ├── game-shop.png
    ├── game-betting.png
    ├── game-race.png
    └── game-results.png

  mobile/iphone-14/
    └── ...

  mobile/ipad/
    └── ...

View gallery: npx serve test-results/mobile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SUMMARY
─────────────────────────────────────────────
Total Tests: 24
Passed: 21 (87.5%)
Warnings: 2
Failed: 1

Priority Fixes:
1. 🔴 Button overlap on small screens
2. 🟡 Touch target size for reroll
3. 🟡 Horse name truncation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Playwright Configuration

Add to `playwright.config.ts`:
```typescript
projects: [
  { name: 'iPhone SE', use: { ...devices['iPhone SE'] } },
  { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
  { name: 'iPad', use: { ...devices['iPad (gen 7)'] } },
]
```

## Implementation

The skill will:
1. Configure Playwright with mobile device profiles
2. Run tests across all target devices
3. Check for layout issues (overflow, overlap)
4. Validate touch target sizes
5. Capture screenshots at each game phase
6. Compare screenshots for visual regressions
7. Generate HTML report with issue highlights
8. Provide CSS fix suggestions for common issues
