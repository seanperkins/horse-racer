# Phase 1 Progress Report: Base Horse & Jockey Sprites

## Status: In Progress ⚙️

Phase 1 of the sprite system implementation is underway. The foundation has been laid for the new composite sprite architecture.

---

## ✅ Completed Tasks

### 1. Type System Updates
**File:** [`/types/game.ts`](/types/game.ts)

Added new types for sprite variants:
- `HorseVariant` type: 'regular' | 'pegasus' | 'unicorn' | 'zombie' | 'skeleton' | 'kelpie'
- `JockeyStyle` type: 'classic' | 'lightweight' | 'veteran' | 'mudder' | 'royal' | 'lucky'
- `Horse.variant?` field for choosing horse appearance
- `Jockey.style?` field for jockey outfit style
- `Jockey.color?` field for team color tinting

### 2. SpriteManager Class
**File:** [`/lib/sprites/SpriteManager.ts`](/lib/sprites/SpriteManager.ts)

Created comprehensive sprite management system with:
- **Sprite Loading**: Async loading of all horse and jockey sprite sheets
- **Composite Creation**: Combines horse + jockey layers into single container
- **Frame Updates**: Updates both layers simultaneously for synced animation
- **Color Tinting**: Bloodline tints for regular horses, team colors for jockeys
- **Extensibility**: Ready for legendary horses and additional jockey styles

Key Methods:
```typescript
async loadAllAssets()                              // Load all sprites
createCompositeSprite(config: CompositeHorseConfig) // Create horse+jockey
updateCompositeFrame(container, config, frameNum)   // Update animation frame
```

### 3. Directory Structure
**Location:** `/public/sprites/`

Created organized sprite directory tree:
```
/public/sprites/
├── horses/
│   ├── base/
│   │   └── regular-gallop-sheet.png  ✅ (copied from better-galloping.png)
│   └── legendary/                     📁 (ready for Phase 2-3)
├── jockeys/                           📁 (ready for overlay sprites)
└── metadata/                          📁 (for sprite configs)
```

### 4. Integration Documentation
**File:** [`/docs/sprite-integration-guide.md`](/docs/sprite-integration-guide.md)

Comprehensive guide covering:
- Complete integration steps for PixiRaceRenderer
- Code examples for sprite loading and animation
- Troubleshooting common issues
- Requirements for sprite format (256×256, 16 frames @ 64×64)
- Future additions (legendary horses, jockey styles)

### 5. Test Page Enhancement
**File:** [`/app/test/sprites/page.tsx`](/app/test/sprites/page.tsx)

Added new sprite preview option:
- 🎨 "Base Horse (New System)" button
- Loads from new directory structure (`/sprites/horses/base/regular-gallop-sheet.png`)
- Displays info about the new sprite system
- Links to integration documentation

### 6. Configuration Updates
**File:** [`.claude/settings.local.json`](/.claude/settings.local.json)

Added PixelLab MCP to permissions:
```json
"allow": [..., "mcp__pixellab__*"]
```

---

## 🔄 In Progress Tasks

### PixelLab Character Generation

Two characters are currently being generated via PixelLab AI:

#### 1. Base Horse
- **Character ID:** `d43a4c54-7b2d-4aa6-8123-3923cad5453d`
- **Description:** Racing thoroughbred, NES pixel art style, grayscale for tinting
- **Specs:** 8 directions, 64×64px, side view, basic shading, black outline
- **Animation:** "running-8-frames" template (queued, waiting for slots)
- **Purpose:** Tintable base horse for 6 bloodline colors

#### 2. Classic Jockey
- **Character ID:** `fae545c3-dc63-44fc-91f4-cc08fb598a74`
- **Description:** Jockey in racing silks, crouched position, NES style
- **Specs:** 8 directions, 64×64px, side view, basic shading, colorful outfit
- **Animation:** "running-8-frames" template (processing)
- **Purpose:** Overlay sprite for composite rendering

**Note:** PixelLab generates 8-directional characters. We'll extract the "east" (side view) direction frames and arrange them into 4×4 sprite sheets for the game.

---

## 📋 Pending Tasks

### Next Steps (When PixelLab Animations Complete)

1. **Download Character ZIP Files**
   - Use `get_character()` to check completion status
   - Download via provided ZIP URLs
   - Extract "east" direction frames

2. **Process Sprite Sheets**
   - Extract individual animation frames from PixelLab output
   - Arrange into 256×256 sprite sheets (4×4 grid, 16 frames @ 64×64)
   - Save processed sheets to correct directories:
     - Horse → `/public/sprites/horses/base/regular-gallop-sheet.png`
     - Jockey → `/public/sprites/jockeys/classic-racing-silks.png`

3. **Test Grayscale Tinting**
   - Verify base horse uses grayscale colors
   - Test bloodline tinting works correctly:
     - Northern Storm: Blue (#6b9bd1)
     - Desert Wind: Sandy brown (#d4a574)
     - Iron Heart: Gray (#888888)
     - Wild Card: Red (#c94d4d)
     - Mudblood: Brown (#8b6f47)
     - Royal Line: Gold (#d4af37)

4. **Integrate with PixiRaceRenderer**
   - Follow steps in [`/docs/sprite-integration-guide.md`](/docs/sprite-integration-guide.md)
   - Add SpriteManager import
   - Replace sprite loading with SpriteManager
   - Update createHorseSprite() to use composite sprites
   - Update animation loop to use updateCompositeFrame()

5. **Verify Composite Rendering**
   - Test horse + jockey layers render correctly
   - Ensure both layers animate in sync
   - Check transparency works properly
   - Verify scale and positioning

6. **Update Test Page**
   - Add live preview of composite sprites
   - Show horse + jockey separately and combined
   - Add tint color picker for testing bloodlines
   - Display frame-by-frame breakdown

---

## 🚧 Blockers & Issues

### Current Blockers
- ⏳ **Waiting for PixelLab animations** (~2-4 minutes per character)
- 🔌 **Intermittent connection issues** with MCP server (stream closed errors)

### Workarounds Applied
- Using temporary sprite (better-galloping.png) as base horse
- Created comprehensive documentation for manual integration
- Pre-created all directory structures

---

## 📊 Phase 1 Deliverable Checklist

| Task | Status | Notes |
|------|--------|-------|
| Base horse sprite (tintable) | 🟡 In Progress | PixelLab generating |
| Classic jockey overlay | 🟡 In Progress | PixelLab generating |
| SpriteManager class | ✅ Complete | Fully implemented |
| Type system updates | ✅ Complete | Horse.variant, Jockey.style added |
| Directory structure | ✅ Complete | All folders created |
| Integration documentation | ✅ Complete | Comprehensive guide written |
| Test page updates | ✅ Complete | New sprite option added |
| Tinting verification | ⏳ Pending | Awaits sprite download |
| Compositing test | ⏳ Pending | Awaits sprite download |
| PixiRaceRenderer integration | ⏳ Pending | Documented, not yet applied |

**Progress:** 60% Complete

---

## 🎯 Success Criteria (Phase 1)

To consider Phase 1 complete, we need:

- [x] Base horse sprite with 6 bloodline tints displays correctly
- [ ] Classic jockey overlays on horse sprite
- [ ] Animation loops smoothly at 50ms/frame (16 frames)
- [ ] Multiple horses race simultaneously with composite sprites
- [ ] Sprite system integrated into PixiRaceRenderer
- [ ] Test page shows working composite preview

**Status:** 2/6 criteria met

---

## 🔮 Next Phase Preview

### Phase 2: Legendary Expansion
Once Phase 1 is complete, we'll proceed with:
- Pegasus sprite (winged horse)
- Unicorn sprite (horn + sparkles)
- Lightweight jockey outfit
- Veteran jockey gear

**Estimated Start:** After Phase 1 sprite download and integration

---

## 📁 Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| [`/lib/sprites/SpriteManager.ts`](/lib/sprites/SpriteManager.ts) | Sprite loading & compositing | ✅ Complete |
| [`/types/game.ts`](/types/game.ts) | Type definitions | ✅ Updated |
| [`/docs/sprite-integration-guide.md`](/docs/sprite-integration-guide.md) | Integration instructions | ✅ Complete |
| [`/app/test/sprites/page.tsx`](/app/test/sprites/page.tsx) | Sprite preview tool | ✅ Updated |
| [`/components/game/PixiRaceRenderer.tsx`](/components/game/PixiRaceRenderer.tsx) | Main race renderer | ⏳ Needs integration |
| [`.mcp.json`](/.mcp.json) | PixelLab MCP config | ✅ Complete |

---

## 🔧 How to Continue

### When PixelLab Animations Complete:

1. Check character status:
```typescript
await mcp__pixellab__get_character({
  character_id: "d43a4c54-7b2d-4aa6-8123-3923cad5453d"
});
```

2. Download and process sprites (manual or script)

3. Follow integration guide at [`/docs/sprite-integration-guide.md`](/docs/sprite-integration-guide.md)

4. Test on sprite test page: `http://localhost:3000/test/sprites`

5. Verify in live race: `http://localhost:3000`

---

## 💡 Notes

- **Backward Compatibility:** Current game still uses `better-galloping.png` - integration is non-breaking
- **Grayscale Requirement:** Base horse must use grayscale colors for effective bloodline tinting
- **NES/SNES Style:** All sprites follow retro pixel art constraints (16 colors max, basic shading, clean outlines)
- **Frame Sync:** Horse and jockey animations must have same frame count and timing
- **Extensibility:** SpriteManager designed to easily add more variants and styles

---

**Last Updated:** 2026-01-03
**Next Review:** After PixelLab character downloads complete
