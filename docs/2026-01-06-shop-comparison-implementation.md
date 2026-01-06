# Shop Comparison Feature - Implementation Plan

## Overview
Add a comprehensive comparison system to the Shop phase that allows users to:
1. Select a preview loadout (horse + jockey + equipment) in the Inventory tab
2. See real-time stat calculations via the Strategy Impact Panel
3. Hover over shop items to see "what if" comparisons
4. Make informed purchasing decisions based on how items affect performance

## Current State
- ✅ Strategy Impact Panel component exists and works in Preparation phase
- ✅ useStrategyImpact hook provides all necessary calculations
- ❌ Shop phase has no comparison features
- ❌ No way to preview item effects before purchase

## Implementation Steps

### Step 1: Add State Management
**File:** `components/game/ShopPhase.tsx` (lines 26-30)

Add after existing state (line 30):
```typescript
// Preview loadout for comparison (persistent across shop/inventory tabs)
const [previewHorse, setPreviewHorse] = useState<Horse | null>(null)
const [previewJockey, setPreviewJockey] = useState<Jockey | null>(null)
const [previewEquipment, setPreviewEquipment] = useState<{
  saddle?: Equipment
  horseshoes?: Equipment
  blinders?: Equipment
}>({})

// Hover state for shop items (shows "what if" comparison)
const [hoveredShopItem, setHoveredShopItem] = useState<{
  type: 'horse' | 'jockey' | 'equipment'
  data: Horse | Jockey | Equipment
  slot?: 'saddle' | 'horseshoes' | 'blinders'
} | null>(null)

// Default strategy for preview (balanced approach)
const defaultStrategy: RaceStrategy = { start: 'steady', mid: 'react', finish: 'maintain' }

// Auto-select first horse and jockey for initial preview
useEffect(() => {
  if (!previewHorse && horses.length > 0) {
    setPreviewHorse(horses[0])
  }
  if (!previewJockey && hiredJockey) {
    setPreviewJockey(hiredJockey)
  }
}, [horses, hiredJockey, previewHorse, previewJockey])

// Determine what to show in Strategy Impact Panel
const displayHorse = hoveredShopItem?.type === 'horse'
  ? (hoveredShopItem.data as Horse)
  : previewHorse

const displayJockey = hoveredShopItem?.type === 'jockey'
  ? (hoveredShopItem.data as Jockey)
  : previewJockey

const displayEquipment = hoveredShopItem?.type === 'equipment'
  ? {
      ...previewEquipment,
      [hoveredShopItem.slot!]: hoveredShopItem.data as Equipment,
    }
  : previewEquipment
```

### Step 2: Update Imports
**File:** `components/game/ShopPhase.tsx` (lines 3-11)

Add to imports:
```typescript
import { StrategyImpactPanel } from './StrategyImpactPanel'
import type { Horse, Jockey, Equipment, RaceStrategy } from '@/types/game'
```

Also add to gameStore destructuring (line 28):
```typescript
const { gold, shopUnits, horses, hiredJockey, equipment, currentRound, stableSlots, currentTrack } = useGameStore()
```

### Step 3: Restructure Inventory Tab Layout
**File:** `components/game/ShopPhase.tsx` (lines 326-391)

Replace the entire Inventory Tab section with a two-column grid layout:

**LEFT COLUMN (2/3 width on XL screens):**
- Horses Inventory (with click-to-select)
- Jockey Inventory (with click-to-select)
- Equipment Inventory (with click-to-select by slot)

**RIGHT COLUMN (1/3 width on XL screens, full width on mobile):**
- Strategy Impact Panel (sticky)
- Shows current preview loadout stats
- Updates on hover in shop tab

### Step 4: Add Selection Indicators
For inventory items, wrap cards in clickable divs:

```typescript
<div
  onClick={() => setPreviewHorse(horse)}
  className={`cursor-pointer transition ${
    previewHorse?.id === horse.id ? 'ring-2 ring-blue-500 rounded-lg' : ''
  }`}
>
  <HorseCard ... />
</div>
```

For equipment, need to track which slot:
```typescript
<div
  onClick={() => setPreviewEquipment({ ...previewEquipment, saddle: item })}
  className={`cursor-pointer transition ${
    previewEquipment.saddle?.id === item.id ? 'ring-2 ring-blue-500 rounded-lg' : ''
  }`}
>
  <EquipmentCard ... />
</div>
```

### Step 5: Add Hover Handlers to Shop Items
**Files:** Horse/Jockey/Equipment card rendering in Shop tab

For horses (line ~220):
```typescript
<div
  onMouseEnter={() => setHoveredShopItem({ type: 'horse', data: horse })}
  onMouseLeave={() => setHoveredShopItem(null)}
>
  <HorseCard ... />
</div>
```

For equipment (need to detect slot):
```typescript
<div
  onMouseEnter={() => setHoveredShopItem({
    type: 'equipment',
    data: item,
    slot: item.slot
  })}
  onMouseLeave={() => setHoveredShopItem(null)}
>
  <EquipmentCard ... />
</div>
```

### Step 6: Add Strategy Impact Panel to Inventory Sidebar
After the equipment inventory section (line ~390), add:

```typescript
            </div> {/* End left column */}

            {/* Right sidebar - Strategy Impact Panel */}
            <div className="xl:sticky xl:top-4 xl:self-start">
              <div className="th-panel rounded-lg p-4">
                <h3 className="font-bold mb-3 text-sm">
                  {hoveredShopItem ? 'Preview with Purchase' : 'Current Preview'}
                </h3>

                {hoveredShopItem && (
                  <div className="mb-3 text-xs th-label p-2 bg-yellow-500/10 rounded">
                    Hovering: <strong>{hoveredShopItem.data.name}</strong>
                  </div>
                )}

                <StrategyImpactPanel
                  horse={displayHorse}
                  jockey={displayJockey}
                  equipment={displayEquipment}
                  strategy={defaultStrategy}
                  collapsed={false}
                />

                {currentTrack && (
                  <div className="mt-3 text-xs th-label">
                    <strong>Next Track:</strong> {currentTrack.name} ({currentTrack.surface})
                  </div>
                )}
              </div>
            </div>
          </div> {/* End grid */}
        )}
```

### Step 7: Also Show Panel in Shop Tab (Optional Enhancement)
Add the same Strategy Impact Panel to the Shop tab as well, positioned as a sticky sidebar.

## Testing Checklist
- [ ] Preview loadout auto-selects first horse/jockey on load
- [ ] Clicking horses in inventory updates preview
- [ ] Clicking jockey in inventory updates preview
- [ ] Clicking equipment in inventory updates preview by slot
- [ ] Selected items show visual indicator (ring)
- [ ] Strategy Impact Panel shows correct stats for preview
- [ ] Hovering shop items updates Strategy Impact Panel
- [ ] Hover indicator shows which item is being previewed
- [ ] Panel is sticky on desktop, scrolls on mobile
- [ ] Switching tabs maintains preview selection
- [ ] Panel shows terrain alignment for next track

## UI/UX Considerations
1. **Visual Feedback**: Selected items have blue ring, hovered items show in panel header
2. **Mobile Responsive**: Panel appears below inventory on mobile (full width)
3. **Clear Intent**: Header text changes based on hover state
4. **Persistent State**: Preview selections persist when switching between Shop/Inventory tabs
5. **Track Context**: Show next track info for strategic purchasing

## Files to Modify
1. `components/game/ShopPhase.tsx` - Main implementation
2. No new files needed - reuses existing components

## Estimated Complexity
- **State Management**: Medium (hover state + selection state)
- **Layout Changes**: Medium (two-column grid with responsive breakpoints)
- **Event Handlers**: Low (onClick, onMouseEnter, onMouseLeave)
- **Component Integration**: Low (StrategyImpactPanel already exists)

## Success Criteria
✅ Users can select a preview loadout in inventory
✅ Users can see how shop items would affect their stats before buying
✅ Hover interactions feel smooth and responsive
✅ Mobile layout works without Strategy Impact Panel blocking content
✅ All stat calculations are accurate (reusing existing hook)
