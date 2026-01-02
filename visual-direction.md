# Visual Direction Mockup - Thunder Hooves

Goal: bold 16-bit race-night vibe with playful pixel UI, readable data density, and strong phase identity.

## Core Look
- Mood: neon track lights, dusty sunset gradients, carnival scoreboard energy.
- Texture: subtle pixel-noise overlay, scanline highlight on cards.
- Shapes: chunky rounded rectangles, pixel-corner accents, beveled panels.
- Iconography: chunky pixel icons for gold/hearts/track/synergy.

## Typography
- Display: "Press Start 2P" (headlines, phase titles).
- Body/UI: "VT323" or "Pixelify Sans" (stats, labels, buttons).
- Numeric: "IBM Plex Mono" fallback for timers/odds if needed.

## Color System
Use CSS variables to keep a cohesive palette.

```css
:root {
  --bg-deep: #0e0d1b;
  --bg-track: #1f1b2e;
  --bg-panel: #2a2540;
  --bg-panel-strong: #342d52;
  --text-main: #f7f2e8;
  --text-dim: #b7aebf;
  --accent-gold: #f4c04b;
  --accent-red: #ef5d5d;
  --accent-green: #5bd08a;
  --accent-blue: #4db2ff;
  --accent-orange: #ff8a3d;
  --accent-cyan: #45f2d7;
  --outline: #4f4772;
}
```

Avoid purple-heavy or flat gray UI; use warm golds, cyan highlights, and red warnings.

## Background Direction
- Gradient sky: deep navy -> dusk orange -> dark track.
- Parallax bands: crowd silhouettes, rail, track texture.
- Subtle animated sparkles on lobby/phase headers.

## Phase Identity
Each phase gets a distinct banner stripe and icon:
- Lobby: lightning bolt + cyan banner.
- Shop: coin stack + gold banner.
- Prep: wrench + teal banner.
- Betting: ticket + orange banner.
- Race: flag + red banner.
- Results: trophy + gold banner.

## Component Mockups (ASCII)

Lobby (join)
```
┌───────────────────────────────────────────────────────────────┐
│  THUNDER HOOVES               [pixel lightning]               │
│  "Draft. Bet. Race."                                         │
│                                                               │
│  Name [__________]      [Join Public]  [Create Private]        │
│  Code [ABCD] [Join]                                      │
│                                                               │
│  Tip: "Draft for bloodlines. Bet for comebacks."              │
└───────────────────────────────────────────────────────────────┘
```

Shop
```
┌───────────────┐  ┌───────────────────────────────────────────┐
│ HUD           │  │ SHOP (Round 3) [timer]                     │
│ Gold 12       │  │ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐     │
│ Hearts 4      │  │ │Horse ││Jocky ││Equip ││Horse ││Jocky │     │
│ Track: Sprint │  │ │stats ││stats ││icon  ││stats ││stats │     │
└───────────────┘  │ └──────┘└──────┘└──────┘└──────┘└──────┘     │
                   │ Reroll (2g)     Training: SPD +1 (3g)      │
                   └───────────────────────────────────────────┘
```

Race
```
┌───────────────────────────────────────────────────────────────┐
│ RACE 4  [flag icon]  Track: Wet/Muddy                          │
│                                                               │
│ Lane 1  ████▌🐎                                                │
│ Lane 2  ███████▌🐎   "Stumble!"                                │
│ Lane 3  █████████▌🐎  "Surge!"                                 │
│ ...                                                           │
│                                                               │
│ Commentary: "Thunderbolt takes the lead!"                      │
└───────────────────────────────────────────────────────────────┘
```

## Motion
- Phase transition: quick horizontal wipe with pixel trail.
- Card reveal: staggered pop-in with tiny "scanline" flash.
- Timers: subtle pulse at 10s remaining, red flash at 5s.

## UI Tokens (Tailwind-ish mapping)
- Panels: `bg-[var(--bg-panel)] border border-[var(--outline)]`
- Buttons: `bg-[var(--accent-gold)] text-black hover:brightness-110`
- Ready: `bg-[var(--accent-green)]`, Not Ready: `bg-[var(--accent-red)]`
- Rarity: Tier1 `text-white`, Tier2 `text-green-300`, Tier3 `text-blue-300`, Tier4 `text-orange-300`

## Next Steps
- Add global CSS variables and font imports.
- Create HUD component shared across phases.
- Build card component for horses/jockeys/equipment with stat bars.
