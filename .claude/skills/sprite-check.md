# Sprite Asset Validator Skill

Validate and manage sprite assets for the Pixi.js race renderer.

## Usage

```bash
/sprite-check
```

## What This Skill Does

Audits all sprite assets required for the game, validates sprite sheet configurations, and identifies missing or malformed assets.

## Options

When invoked, you can:
1. **Full Audit**: Check all sprites against requirements
2. **List Required**: Show all sprites needed per PRD
3. **Validate Sheets**: Check sprite sheet dimensions and frames
4. **Generate Placeholders**: Create missing placeholder sprites
5. **Export Report**: Generate asset checklist for artists

## Required Sprite Categories

### Horse Sprites
```
/public/sprites/horses/
├── base/              # Base horse body (8 directions)
├── bloodlines/        # Bloodline variations (6 types)
│   ├── northern_storm/
│   ├── desert_wind/
│   ├── iron_heart/
│   ├── wild_card/
│   ├── mudblood/
│   └── royal_line/
└── animations/        # Per-direction animations
    ├── idle/          # Standing still (4 frames)
    ├── walk/          # Walking (6 frames)
    ├── run/           # Running (8 frames)
    ├── sprint/        # Sprinting (8 frames)
    ├── stumble/       # Stumble recovery (6 frames)
    └── finish/        # Crossing finish line (4 frames)
```

### Jockey Sprites
```
/public/sprites/jockeys/
├── base/              # Base jockey body
├── colors/            # Jockey silk color variations
└── animations/        # Mounted on horse
    ├── idle/
    ├── riding/
    ├── whipping/
    └── celebrating/
```

### Track Elements
```
/public/sprites/track/
├── surfaces/          # Track surface tiles
│   ├── dry_dirt.png
│   ├── muddy.png
│   ├── turf.png
│   └── synthetic.png
├── decorations/       # Track-side elements
│   ├── fence.png
│   ├── crowd.png
│   ├── banner.png
│   └── finish_line.png
└── weather/           # Weather overlays
    ├── rain.png
    ├── dust.png
    └── sun_glare.png
```

### UI Elements
```
/public/sprites/ui/
├── icons/             # Item and stat icons
├── portraits/         # Horse/jockey portraits
├── badges/            # Achievement badges
└── effects/           # Visual effects (sparkles, etc.)
```

## Sprite Sheet Requirements

### Format
- **File Type**: PNG with transparency
- **Color Depth**: 32-bit RGBA
- **Compression**: Optimized PNG

### Dimensions
- **Horse Sprites**: 64x64 per frame
- **Jockey Sprites**: 32x32 per frame
- **Track Tiles**: 64x64
- **UI Icons**: 32x32 or 64x64

### Animation Frame Counts
| Animation | Frames | FPS |
|-----------|--------|-----|
| Idle      | 4      | 8   |
| Walk      | 6      | 12  |
| Run       | 8      | 16  |
| Sprint    | 8      | 20  |
| Stumble   | 6      | 12  |

## Output Format

```
🎨 Sprite Asset Validator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 Asset Inventory
─────────────────────────────────────────────

HORSES (Required: 48 | Found: 12 | Missing: 36)
  ✓ base/horse_south.png (64x64, 8 frames)
  ✓ base/horse_east.png (64x64, 8 frames)
  ✗ base/horse_north.png - MISSING
  ✗ base/horse_west.png - MISSING
  ⚠️ bloodlines/northern_storm/run.png - Wrong size (32x32)
  ...

JOCKEYS (Required: 24 | Found: 0 | Missing: 24)
  ✗ All jockey sprites missing
  → Using placeholder colors

TRACK (Required: 12 | Found: 8 | Missing: 4)
  ✓ surfaces/dry_dirt.png
  ✓ surfaces/muddy.png
  ✗ surfaces/turf.png - MISSING
  ✗ decorations/crowd.png - MISSING
  ...

UI (Required: 32 | Found: 28 | Missing: 4)
  ✓ icons/speed.png
  ✓ icons/stamina.png
  ⚠️ icons/grit.png - Transparency issue
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY
─────────────────────────────────────────────
Total Required:   116 sprites
Found:            48 sprites (41%)
Missing:          64 sprites
Issues:           4 sprites

🔧 ACTIONS AVAILABLE
─────────────────────────────────────────────
1. Generate placeholders for missing sprites
2. Fix dimension issues automatically
3. Export asset list for artists (CSV/JSON)
4. Validate sprite sheet JSON configs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Placeholder Generation

For missing sprites, generates geometric placeholders:
```
Horse: Colored rectangle with direction arrow
Jockey: Small colored circle
Track: Tiled pattern with label
Icon: Simple geometric shape
```

## Sprite Config Validation

Checks `lib/sprites/spriteConfig.ts` against actual files:
```typescript
// Validates entries like:
{
  name: 'horse_run_south',
  path: '/sprites/horses/base/run_south.png',
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 8,
  fps: 16
}
```

## Implementation

The skill will:
1. Scan `/public/sprites/` directory recursively
2. Compare against required asset manifest
3. Validate image dimensions and formats
4. Check animation frame counts
5. Verify sprite config matches files
6. Generate missing placeholder assets
7. Create artist handoff document
8. Update sprite config for new assets
