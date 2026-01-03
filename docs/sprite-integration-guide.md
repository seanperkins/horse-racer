# Sprite Integration Guide

## Overview
This guide explains how to integrate the new SpriteManager system with composite horse+jockey sprites into PixiRaceRenderer.

## Current Status

### ✅ Completed
- Created `/lib/sprites/SpriteManager.ts` - Central sprite management system
- Added `HorseVariant` and `JockeyStyle` types to `/types/game.ts`
- Added `variant?` field to `Horse` interface
- Added `style?` and `color?` fields to `Jockey` interface
- Created sprite directory structure:
  - `/public/sprites/horses/base/` - Base tintable horse sprites
  - `/public/sprites/horses/legendary/` - Legendary horse variants
  - `/public/sprites/jockeys/` - Jockey overlay sprites
  - `/public/sprites/metadata/` - Sprite configuration files
- Copied `better-galloping.png` to `/public/sprites/horses/base/regular-gallop-sheet.png` as temporary base

### ⏳ In Progress
- Generating PixelLab character animations:
  - Horse ID: `d43a4c54-7b2d-4aa6-8123-3923cad5453d` (racing thoroughbred)
  - Jockey ID: `fae545c3-dc63-44fc-91f4-cc08fb598a74` (racing jockey)
  - Animations processing in background (~2-4 minutes)

## Integration Steps

### Step 1: Add SpriteManager Import

In `components/game/PixiRaceRenderer.tsx`, add:

```typescript
import { SpriteManager } from "@/lib/sprites/SpriteManager";
```

### Step 2: Initialize SpriteManager

Add ref for sprite manager:

```typescript
const spriteManagerRef = useRef<SpriteManager | null>(null);
```

In the initialization function (around line 190), replace sprite loading:

```typescript
// OLD CODE:
const [staticTexture, gallopingTexture] = await Promise.all([
  PIXI.Assets.load('/sprites/horse-sprites.png'),
  PIXI.Assets.load('/sprites/better-galloping.png')
]);

// NEW CODE:
const spriteManager = new SpriteManager();
await spriteManager.loadAllAssets();
spriteManagerRef.current = spriteManager;
```

### Step 3: Update createHorseSprite Function

Replace the `createHorseSprite` function (around line 363) with composite sprite creation:

```typescript
const createHorseSprite = (
  participant: RaceParticipant,
  lane: number
): HorseSprite => {
  const spriteManager = spriteManagerRef.current;
  if (!spriteManager) {
    throw new Error("SpriteManager not initialized");
  }

  // Create composite sprite (horse + jockey layers)
  const container = spriteManager.createCompositeSprite({
    horseType: participant.horse.variant || 'regular',
    bloodline: participant.horse.bloodline,
    jockeyStyle: participant.jockey.style || 'classic',
    jockeyColor: participant.jockey.color
  });

  // Position at start line
  const yPos = TRACK_MARGIN_TOP + (lane * LANE_HEIGHT) + (LANE_HEIGHT / 2);
  container.x = START_LINE_X;
  container.y = yPos;
  container.scale.set(1.25); // Adjust as needed

  // Add name text above horse
  const nameText = new PIXI.Text({
    text: `${participant.horse.name}`,
    style: new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: "#ffffff",
      stroke: { color: "#000000", width: 2 },
    }),
  });
  nameText.anchor.set(0.5, 1);
  nameText.position.set(0, -45);
  container.addChild(nameText);

  // Add status text below horse
  const statusText = new PIXI.Text({
    text: "",
    style: new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: 10,
      fill: "#ffff00",
      stroke: { color: "#000000", width: 2 },
    }),
  });
  statusText.anchor.set(0.5, 0);
  statusText.position.set(0, 40);
  statusText.visible = false;
  container.addChild(statusText);

  app.stage.addChild(container);

  return {
    body: container,
    currentX: START_LINE_X,
    targetX: START_LINE_X,
    animationFrame: 0,
    animationTimer: 0,
    nameText,
    statusText,
    isStumbled: false,
  };
};
```

### Step 4: Update Animation Loop

In the animation update loop (around line 759), update frame rendering:

```typescript
const shouldAnimate = !horse.isStumbled && !horseFinished;

if (shouldAnimate && horse.body instanceof PIXI.Container && spriteManagerRef.current) {
  horse.animationTimer += tickInterval;

  if (horse.animationTimer >= 50) { // 50ms per frame
    horse.animationTimer = 0;
    horse.animationFrame = (horse.animationFrame + 1) % 16; // 16 frames total

    // Update composite sprite frame
    spriteManagerRef.current.updateCompositeFrame(
      horse.body,
      {
        horseType: participants[i].horse.variant || 'regular',
        bloodline: participants[i].horse.bloodline,
        jockeyStyle: participants[i].jockey.style || 'classic',
        jockeyColor: participants[i].jockey.color
      },
      horse.animationFrame
    );
  }
}
```

## Testing

1. **Test with current sprites**: The system should work with the existing `better-galloping.png` sprite
2. **Verify tinting**: Regular horses should show different colors based on bloodline
3. **Check jockey layers**: Once jockey sprites are added, they should overlay correctly

## Future Additions

### When PixelLab Sprites Are Ready

1. Download the character ZIP files
2. Extract the "east" direction frames (side view for racing)
3. Arrange into 4x4 grid (256x256, 16 frames @ 64x64 each)
4. Save to appropriate directories:
   - Base horse → `/public/sprites/horses/base/regular-gallop-sheet.png`
   - Jockey → `/public/sprites/jockeys/classic-racing-silks.png`

### Adding Legendary Horses

Uncomment the legendary horse loading in `SpriteManager.ts`:

```typescript
this.horseSheets.set("pegasus", await this.loadSpriteSheet("/sprites/horses/legendary/pegasus-gallop-sheet.png"));
this.horseSheets.set("unicorn", await this.loadSpriteSheet("/sprites/horses/legendary/unicorn-gallop-sheet.png"));
// ... etc
```

### Adding More Jockey Styles

Uncomment additional jockey styles in `SpriteManager.ts`:

```typescript
this.jockeySheets.set("lightweight", await this.loadSpriteSheet("/sprites/jockeys/lightweight-outfit.png"));
this.jockeySheets.set("veteran", await this.loadSpriteSheet("/sprites/jockeys/veteran-gear.png"));
// ... etc
```

## Sprite Requirements

### Format
- Size: 256×256px sprite sheet
- Grid: 4×4 (16 frames)
- Frame size: 64×64px per frame
- Format: PNG with transparency

### Base Horse
- **Grayscale palette** for effective color tinting
- Black outline for NES/SNES style
- Basic shading (2-3 shades of gray)
- Side view (racing left-to-right)

### Jockey Overlays
- Transparent background
- Matches horse animation frames exactly
- Colorful racing silks (tintable for team colors)
- Same size and grid as horse sprites

## Troubleshooting

### Sprites Not Loading
- Check file paths in SpriteManager.ts match actual file locations
- Verify PNG files are in correct directories
- Check browser console for asset loading errors

### Tinting Not Working
- Ensure base horse sprite uses grayscale colors
- Verify bloodline names match exactly (case-sensitive)
- Check that sprite is set to 'regular' variant

### Animation Not Smooth
- Verify all 16 frames are present in sprite sheet
- Check animation timing (50ms default)
- Ensure frames are arranged in correct 4×4 grid

## References

- [Plan Document](/Users/sean/.claude/plans/snappy-plotting-dahl.md)
- [SpriteManager Implementation](/lib/sprites/SpriteManager.ts)
- [Type Definitions](/types/game.ts)
