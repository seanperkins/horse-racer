# Pixel Art Sprite Configuration Skill

Generate Pixi.js sprite configurations and placeholder geometry for race animations.

## Usage

```bash
/pixelart-sprite
```

## What This Skill Does

Generates sprite sheet configurations for Pixi.js and creates placeholder geometric shapes for MVP development.

## Outputs

### 1. Pixi.js TextureAtlas JSON
Creates a texture atlas configuration file for sprite animations:

```json
{
  "frames": {
    "horse_gallop_1.png": {
      "frame": { "x": 0, "y": 0, "w": 32, "h": 32 },
      "sourceSize": { "w": 32, "h": 32 }
    },
    "horse_gallop_2.png": {
      "frame": { "x": 32, "y": 0, "w": 32, "h": 32 },
      "sourceSize": { "w": 32, "h": 32 }
    }
  },
  "meta": {
    "image": "sprites.png",
    "size": { "w": 512, "h": 512 },
    "scale": "1"
  }
}
```

### 2. Animation Definitions
Based on PRD Section 12.3 priorities:

**High Priority:**
- `gallop`: 6 frames, 100ms per frame, loop
- `stumble`: 4 frames, 150ms per frame, once
- `jockey_fall`: 5 frames, 120ms per frame, once

**Medium Priority:**
- `jump`: 5 frames, 80ms per frame, once
- `victory`: 6 frames, 150ms per frame, once

**Low Priority:**
- `idle`: 2 frames, 500ms per frame, loop

### 3. Placeholder Geometry Config
For MVP without pixel art assets:

```typescript
// /components/race/PlaceholderSprites.ts
export const PlaceholderConfig = {
  horse: {
    width: 32,
    height: 24,
    color: 0x8B4513, // Brown
    shape: 'roundedRectangle',
    cornerRadius: 4
  },
  jockey: {
    width: 12,
    height: 12,
    color: 0xFF6B6B, // Red
    shape: 'circle',
    offsetX: 10,
    offsetY: -8
  },
  track: {
    lanes: 8,
    laneHeight: 60,
    colors: {
      dry_dirt: 0xD2691E,
      wet_muddy: 0x8B7355,
      turf_grass: 0x228B22
    }
  },
  obstacles: {
    jump: { shape: 'triangle', color: 0x654321 },
    water: { shape: 'wave', color: 0x4169E1 }
  }
}
```

### 4. TypeScript Types

```typescript
export type AnimationName =
  | 'gallop'
  | 'stumble'
  | 'jockey_fall'
  | 'jump'
  | 'victory'
  | 'idle'

export interface SpriteAnimation {
  frames: string[]
  frameRate: number
  loop: boolean
}
```

## Options

When invoked:
1. **Full Config**: Generate complete sprite configuration
2. **Placeholder Only**: Just the geometric placeholder config
3. **Animation List**: List all required animations with specs

## Implementation

The skill will:
1. Read animation requirements from PRD
2. Generate TextureAtlas JSON format
3. Create placeholder geometry definitions
4. Output TypeScript type definitions
5. Generate Pixi.js AnimatedSprite setup code
6. List all required sprite filenames
