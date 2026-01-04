"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import type { RaceParticipant } from "@/types/game";
import type { RaceInputs } from "@/types/messages";
import { RaceSimulator } from "@/game/simulation/RaceSimulator";
import { TrackInfo, RaceCanvas, RaceSidebar, RaceEventLog } from "./race";
import { useGameStore } from "@/lib/store/gameStore";
import { SpriteManager } from "@/lib/sprites/SpriteManager";

interface PixiRaceRendererProps {
  raceInputs: RaceInputs;
  onRaceComplete: (result: { placements: any[]; events: any[] }) => void;
  onRaceEvent?: (events: RaceEvent[]) => void;
}

interface RaceEvent {
  tick: number;
  playerId: string;
  playerName: string;
  type: string;
  description: string;
}

interface HorseSprite {
  container: PIXI.Container;
  body: PIXI.Sprite | PIXI.Graphics;
  nameText: PIXI.Text;
  statusText: PIXI.Text;
  playerId: string;
  lane: number;
  targetX: number;
  currentX: number;
  isStumbled: boolean;
  animationFrame: number;
  animationTimer: number;
  particles: PIXI.Graphics[];
  particleTimer: number;
}

interface CameraState {
  x: number; // Current camera X position
  targetX: number; // Target camera X position
}

export function PixiRaceRenderer({
  raceInputs,
  onRaceComplete,
  onRaceEvent,
}: PixiRaceRendererProps) {
  const { playerId } = useGameStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const horsesRef = useRef<Map<string, HorseSprite>>(new Map());
  const simulatorRef = useRef<RaceSimulator | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [currentTick, setCurrentTick] = useState(0);
  const [liveStandings, setLiveStandings] = useState<
    Array<{
      playerId: string;
      playerName: string;
      horseName: string;
      position: number; // Current race position (1st, 2nd, 3rd)
      isFinished: boolean; // Has this horse crossed the finish line?
      distance: number; // Distance covered in meters
    }>
  >([]);
  const finishersRef = useRef<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 });
  const cameraRef = useRef<CameraState>({ x: 0, targetX: 0 });
  const trackContainerRef = useRef<PIXI.Container | null>(null);
  const farBackgroundRef = useRef<PIXI.Container | null>(null);
  const midBackgroundRef = useRef<PIXI.Container | null>(null);
  const horseSpriteTextureRef = useRef<PIXI.Texture | null>(null);
  const gallopingSpriteTextureRef = useRef<PIXI.Texture | null>(null);
  const spriteManagerRef = useRef<SpriteManager | null>(null);

  // Race configuration (responsive)
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const LANE_HEIGHT = Math.max(40, CANVAS_HEIGHT / 10);
  const TRACK_PADDING = 20;
  const HORSE_WIDTH = 80;  // Fixed size for better visibility
  const HORSE_HEIGHT = 80; // Fixed size for better visibility
  // Scale: 1 meter = 3 pixels for better visual representation
  const METERS_TO_PIXELS = 3;

  // Calculate responsive canvas size
  useEffect(() => {
    const calculateSize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Account for sidebar and padding
      const availableWidth =
        windowWidth > 1024 ? windowWidth - 400 : windowWidth - 32; // 400px for sidebar on large screens, 32px padding on small
      const availableHeight = windowHeight - 300; // Account for header, footer, controls

      // Maintain 2:1 aspect ratio, but respect available space
      let width = Math.min(1200, Math.max(800, availableWidth));
      let height = Math.min(600, Math.max(400, availableHeight));

      // Adjust to maintain aspect ratio
      const targetRatio = 2;
      if (width / height > targetRatio) {
        width = height * targetRatio;
      } else {
        height = width / targetRatio;
      }

      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    calculateSize();
    window.addEventListener("resize", calculateSize);
    return () => window.removeEventListener("resize", calculateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Prevent double initialization (for React StrictMode)
    if (hasInitializedRef.current) {
      console.log("App already initialized, skipping");
      return;
    }

    hasInitializedRef.current = true;
    console.log("Initializing Pixi app...");
    initPixiApp().then(() => {
      console.log("Pixi app initialized successfully");
      setIsInitialized(true);
    });

    return () => {
      cleanup();
    };
  }, []);

  // Reinitialize when canvas size changes (after initial setup)
  useEffect(() => {
    if (isInitialized && appRef.current) {
      console.log("Canvas size changed, resizing app...");
      appRef.current.renderer.resize(CANVAS_WIDTH, CANVAS_HEIGHT);

      // Redraw track with new size
      const raceDistanceMeters = simulatorRef.current?.getRaceDistance() || 1000;
      const surface = raceInputs?.track?.surface || 'dry_dirt';
      appRef.current.stage.removeChildren();
      drawTrack(appRef.current, raceDistanceMeters, surface);

      // Recreate horses if race is running
      if (simulatorRef.current && raceInputs && trackContainerRef.current) {
        horsesRef.current.forEach((horse) => {
          trackContainerRef.current!.addChild(horse.container);
        });
      }
    }
  }, [canvasSize, isInitialized]);

  useEffect(() => {
    console.log("Race inputs effect:", {
      isInitialized,
      hasRaceInputs: !!raceInputs,
    });
    if (isInitialized && raceInputs) {
      console.log("Starting race with inputs:", raceInputs);
      startRace();
    }
  }, [isInitialized, raceInputs]);

  const initPixiApp = async () => {
    if (!canvasRef.current) return;

    // Clear any existing canvas (prevents duplicates in StrictMode)
    while (canvasRef.current.firstChild) {
      canvasRef.current.removeChild(canvasRef.current.firstChild);
    }

    // Create Pixi application
    const app = new PIXI.Application();
    await app.init({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x2a4a2a, // Dark green track
      antialias: true,
    });

    canvasRef.current.appendChild(app.canvas as HTMLCanvasElement);
    appRef.current = app;

    // Initialize SpriteManager for composite horse+jockey sprites
    console.log('[PIXI] Initializing SpriteManager...');
    const spriteManager = new SpriteManager();
    await spriteManager.loadAllAssets();
    spriteManagerRef.current = spriteManager;
    console.log('[PIXI] SpriteManager initialized successfully');

    // Keep legacy sprite loading as fallback for now
    const [staticTexture, gallopingTexture] = await Promise.all([
      PIXI.Assets.load('/sprites/horse-sprites.png'),
      PIXI.Assets.load('/sprites/better-galloping.png')
    ]);
    horseSpriteTextureRef.current = staticTexture;
    gallopingSpriteTextureRef.current = gallopingTexture;
    console.log('[PIXI] Legacy sprites loaded as fallback');

    // Draw placeholder track (will be redrawn when race starts)
    drawTrack(app, 1000); // Default 1000m track for initialization
  };

  const drawTrack = (app: PIXI.Application, raceDistanceMeters: number = 1000, surface: string = 'dry_dirt') => {
    // Calculate actual track length based on race distance
    const trackLengthPixels = raceDistanceMeters * METERS_TO_PIXELS;

    // Surface-specific colors and styling
    const surfaceColors: Record<string, { track: number; lane: number; name: string }> = {
      dry_dirt: { track: 0x8b6f47, lane: 0x6b5437, name: 'Dry Dirt' },
      wet_muddy: { track: 0x6b5437, lane: 0x4a3c28, name: 'Wet & Muddy' },
      turf_grass: { track: 0x2a5a2a, lane: 0x1a4a1a, name: 'Turf Grass' },
      rocky: { track: 0x787878, lane: 0x585858, name: 'Rocky' },
      sand: { track: 0xe6d7b8, lane: 0xc6b798, name: 'Sand' },
      frozen: { track: 0xb8d4e6, lane: 0x98b4c6, name: 'Frozen' },
    };
    const colors = surfaceColors[surface] || surfaceColors.dry_dirt;

    // Layer 1: Far background - grass/hills behind the track (slowest parallax)
    // This container stays independent and moves at 20% camera speed
    const farBackground = new PIXI.Container();
    farBackgroundRef.current = farBackground;

    const hills = new PIXI.Graphics();
    // Background extends just past the finish line
    const backgroundWidth = trackLengthPixels + CANVAS_WIDTH;
    hills.rect(0, 0, backgroundWidth, CANVAS_HEIGHT);
    hills.fill(0x1a3a1a); // Dark green background

    // Add some distant hill shapes for depth
    const numHills = Math.ceil(backgroundWidth / (CANVAS_WIDTH / 4));
    for (let i = 0; i < numHills; i++) {
      const hillX = (backgroundWidth / numHills) * i;
      const hillY = CANVAS_HEIGHT - 80;
      hills.moveTo(hillX - 100, CANVAS_HEIGHT);
      hills.bezierCurveTo(
        hillX - 50, hillY - 30,
        hillX + 50, hillY - 30,
        hillX + 100, CANVAS_HEIGHT
      );
      hills.fill({ color: 0x234a23, alpha: 0.6 });
    }
    farBackground.addChild(hills);
    app.stage.addChild(farBackground);

    // Layer 2: Mid background (trees/scenery) - medium parallax (50% camera speed)
    // This container moves independently at 50% camera speed
    const midBackground = new PIXI.Container();
    midBackgroundRef.current = midBackground;

    const trees = new PIXI.Graphics();
    // Trees extend just past the finish line
    const treeAreaWidth = trackLengthPixels + CANVAS_WIDTH;
    for (let i = 0; i < treeAreaWidth / 150; i++) {
      const treeX = i * 150 + Math.random() * 50;
      const treeY = CANVAS_HEIGHT - 100;
      // Simple tree shapes
      trees.rect(treeX, treeY, 8, 30); // Trunk
      trees.fill(0x8b4513);
      trees.circle(treeX + 4, treeY - 10, 15); // Foliage
      trees.fill(0x228b22);
    }
    midBackground.addChild(trees);
    app.stage.addChild(midBackground);

    // Layer 3: Track container - full camera scroll speed (100%)
    const trackContainer = new PIXI.Container();
    trackContainerRef.current = trackContainer;

    // Track surface graphics
    const trackGraphics = new PIXI.Graphics();

    // Draw track background with surface-specific color
    trackGraphics.rect(0, 0, trackLengthPixels + TRACK_PADDING * 2, CANVAS_HEIGHT);
    trackGraphics.fill(colors.track);

    // Draw racing lanes
    const numLanes = 8;
    const laneY = TRACK_PADDING;

    for (let i = 0; i <= numLanes; i++) {
      const y = laneY + i * LANE_HEIGHT;
      trackGraphics.moveTo(TRACK_PADDING, y);
      trackGraphics.lineTo(trackLengthPixels + TRACK_PADDING, y);
    }
    trackGraphics.stroke({ width: 2, color: colors.lane, alpha: 0.5 });

    // Draw top barrier/fence for depth perception
    const fenceY = TRACK_PADDING - 5;
    const fenceHeight = 15;

    // Fence posts every 100 pixels
    for (let x = TRACK_PADDING; x <= trackLengthPixels + TRACK_PADDING; x += 100) {
      // Fence post
      trackGraphics.rect(x - 2, fenceY, 4, fenceHeight);
      trackGraphics.fill(0x8b4513); // Brown
    }

    // Horizontal rails
    trackGraphics.moveTo(TRACK_PADDING, fenceY + 3);
    trackGraphics.lineTo(trackLengthPixels + TRACK_PADDING, fenceY + 3);
    trackGraphics.moveTo(TRACK_PADDING, fenceY + fenceHeight - 3);
    trackGraphics.lineTo(trackLengthPixels + TRACK_PADDING, fenceY + fenceHeight - 3);
    trackGraphics.stroke({ width: 2, color: 0x654321 }); // Dark brown

    // Draw distance markers every 200 meters
    const trackBottomY = TRACK_PADDING + numLanes * LANE_HEIGHT;
    for (let distance = 0; distance <= raceDistanceMeters; distance += 200) {
      const x = TRACK_PADDING + distance * METERS_TO_PIXELS;
      trackGraphics.moveTo(x, TRACK_PADDING);
      trackGraphics.lineTo(x, trackBottomY);
      trackGraphics.stroke({ width: 1, color: 0xffffff, alpha: 0.3 });

      // Add distance text at bottom
      const distanceText = new PIXI.Text({
        text: `${distance}m`,
        style: {
          fontSize: 10,
          fill: 0xffffff,
        }
      });
      distanceText.alpha = 0.5;
      distanceText.position.set(x - 15, trackBottomY + 5);
      trackGraphics.addChild(distanceText);
    }

    // Draw start line
    trackGraphics.rect(
      TRACK_PADDING - 5,
      TRACK_PADDING,
      5,
      numLanes * LANE_HEIGHT
    );
    trackGraphics.fill(0xffffff);

    // Draw finish line (checkered pattern)
    const finishX = TRACK_PADDING + trackLengthPixels;
    const checkerSize = 10;
    for (let i = 0; i < (numLanes * LANE_HEIGHT) / checkerSize; i++) {
      for (let j = 0; j < 2; j++) {
        const color = (i + j) % 2 === 0 ? 0xffffff : 0x000000;
        trackGraphics.rect(
          finishX - checkerSize * 2 + j * checkerSize,
          TRACK_PADDING + i * checkerSize,
          checkerSize,
          checkerSize
        );
        trackGraphics.fill(color);
      }
    }

    trackContainer.addChild(trackGraphics);
    app.stage.addChild(trackContainer);

    return trackLengthPixels;
  };

  const createHorseSprite = (
    participant: RaceParticipant,
    lane: number
  ): HorseSprite => {
    let container: PIXI.Container;
    let body: any;

    // Try to use SpriteManager for composite sprites
    if (spriteManagerRef.current) {
      try {
        // Create composite sprite (horse + jockey layers)
        container = spriteManagerRef.current.createCompositeSprite({
          horseType: participant.horse.variant || 'regular',
          bloodline: participant.horse.bloodline,
          jockeyStyle: participant.jockey.style || 'classic',
          jockeyColor: participant.jockey.color
        });

        // Scale the composite sprite
        container.scale.set(1.25);

        body = container; // The container itself is the body

        console.log('[PIXI] Created composite sprite for', participant.playerName, {
          horseType: participant.horse.variant || 'regular',
          bloodline: participant.horse.bloodline,
          jockeyStyle: participant.jockey.style || 'classic',
          lane
        });
      } catch (error) {
        console.error('[PIXI] Failed to create composite sprite, falling back:', error);
        // Fall through to legacy sprite creation
        container = new PIXI.Container();
      }
    } else {
      container = new PIXI.Container();
    }

    // Fallback: Use legacy galloping sprite sheet if composite failed or unavailable
    if (!body && gallopingSpriteTextureRef.current) {
      // Galloping sprite sheet is 256x256 (4 frames x 4 rows)
      // Each sprite is 64x64 pixels
      const SPRITE_WIDTH = 64;
      const SPRITE_HEIGHT = 64;

      // Use row 0 for all horses (we have 4 rows available)
      const row = 0;
      const col = 0; // Start with first frame

      // Create texture from sprite sheet region (first frame)
      const texture = new PIXI.Texture({
        source: gallopingSpriteTextureRef.current.source,
        frame: new PIXI.Rectangle(
          col * SPRITE_WIDTH,
          row * SPRITE_HEIGHT,
          SPRITE_WIDTH,
          SPRITE_HEIGHT
        ),
      });

      const sprite = new PIXI.Sprite(texture);
      sprite.width = HORSE_WIDTH;
      sprite.height = HORSE_HEIGHT;
      sprite.anchor.set(0.5, 0.5); // Center the sprite

      // Apply simple color tint to differentiate horses
      const bloodlineToTint: Record<string, number> = {
        "Northern Storm": 0x6b9bd1,  // Blue
        "Desert Wind": 0xd4a574,     // Sandy brown
        "Iron Heart": 0x888888,      // Gray
        "Wild Card": 0xc94d4d,       // Red
        "Mudblood": 0x8b6f47,        // Brown
        "Royal Line": 0xd4af37,      // Gold
      };

      sprite.tint = bloodlineToTint[participant.horse.bloodline] || 0xffffff;

      body = sprite;
      container.addChild(sprite);

      console.log('[PIXI] Created legacy galloping horse for', participant.playerName, {
        bloodline: participant.horse.bloodline,
        row,
        width: HORSE_WIDTH,
        height: HORSE_HEIGHT,
        lane
      });
    } else if (!body) {
      // Final fallback: colored rectangles
      const graphics = new PIXI.Graphics();
      const horseColor = getHorseColor(participant.horse.bloodline);

      graphics
        .rect(-HORSE_WIDTH/2, -HORSE_HEIGHT/2, HORSE_WIDTH, HORSE_HEIGHT)
        .fill(horseColor);

      body = graphics;
      container.addChild(graphics);

      console.log('[PIXI] Created fallback graphics for', participant.playerName);
    }

    // Add name text above horse (closer to the sprite)
    const nameText = new PIXI.Text({
      text: participant.horse.name,
      style: {
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: 'bold',
      }
    });
    nameText.anchor.set(0.5, 1);
    nameText.position.set(0, -HORSE_HEIGHT/2 + 15); // Lower, closer to the sprite
    container.addChild(nameText);

    // Add status text below horse
    const statusText = new PIXI.Text({
      text: '',
      style: {
        fontSize: 10,
        fill: 0xff0000,
        fontWeight: 'bold',
      }
    });
    statusText.anchor.set(0.5, 0);
    statusText.position.set(0, HORSE_HEIGHT/2 + 5);
    container.addChild(statusText);

    // Initial position
    const laneY = TRACK_PADDING + lane * LANE_HEIGHT + LANE_HEIGHT / 2;
    container.position.set(TRACK_PADDING, laneY);

    console.log('[PIXI] Container positioned at', {
      x: TRACK_PADDING,
      y: laneY,
      lane,
      LANE_HEIGHT,
      TRACK_PADDING
    });

    return {
      container,
      body,
      nameText,
      statusText,
      playerId: participant.playerId,
      lane,
      targetX: TRACK_PADDING,
      currentX: TRACK_PADDING,
      isStumbled: false,
      animationFrame: 0,
      animationTimer: 0,
      particles: [],
      particleTimer: 0,
    };
  };

  const getHorseColor = (bloodline: string): number => {
    const colors: Record<string, number> = {
      "Northern Storm": 0x6b9bd1, // Blue
      "Desert Wind": 0xd4a574, // Sandy brown
      "Iron Heart": 0x808080, // Gray
      "Wild Card": 0xc94d4d, // Red
      Mudblood: 0x8b6f47, // Brown
      "Royal Line": 0xd4af37, // Gold
    };
    return colors[bloodline] || 0xcccccc;
  };

  /**
   * Apply tint to a horse sprite (handles both legacy sprites and composite sprites)
   */
  const applyHorseTint = (horse: HorseSprite, tint: number) => {
    if (horse.body instanceof PIXI.Sprite) {
      horse.body.tint = tint;
    } else if (horse.body instanceof PIXI.Container) {
      // For composite sprites, tint all children
      horse.body.children.forEach((child) => {
        if (child instanceof PIXI.Sprite) {
          child.tint = tint;
        }
      });
    }
  };

  /**
   * Restore original tint for a horse (bloodline color for horse, jockey color for jockey)
   */
  const restoreOriginalTint = (horse: HorseSprite, playerId: string) => {
    const originalParticipant = raceInputs?.entries.find(e => e.playerId === playerId);
    if (!originalParticipant) {
      console.warn(`[RESTORE TINT] No participant found for ${playerId}`);
      return;
    }

    const bloodlineToTint: Record<string, number> = {
      "Northern Storm": 0x6b9bd1,
      "Desert Wind": 0xd4a574,
      "Iron Heart": 0x888888,
      "Wild Card": 0xc94d4d,
      "Mudblood": 0x8b6f47,
      "Royal Line": 0xd4af37,
    };

    if (horse.body instanceof PIXI.Sprite) {
      // Legacy sprite - apply bloodline tint
      horse.body.tint = bloodlineToTint[originalParticipant.horse.bloodline] || 0xffffff;
      console.log(`[RESTORE TINT] Legacy sprite ${playerId} -> ${horse.body.tint.toString(16)}`);
    } else if (horse.body instanceof PIXI.Container) {
      // Composite sprite - restore tint on individual layers
      const horseLayer = horse.body.children[0] as PIXI.Sprite;
      const jockeyLayer = horse.body.children[1] as PIXI.Sprite;

      console.log(`[RESTORE TINT] Composite sprite ${playerId}, children: ${horse.body.children.length}`);

      if (horseLayer) {
        const targetTint = bloodlineToTint[originalParticipant.horse.bloodline] || 0xffffff;
        horseLayer.tint = targetTint;
        console.log(`[RESTORE TINT] Horse layer ${playerId} bloodline=${originalParticipant.horse.bloodline} -> 0x${targetTint.toString(16)}`);
      } else {
        console.warn(`[RESTORE TINT] No horse layer for ${playerId}`);
      }

      if (jockeyLayer) {
        jockeyLayer.tint = originalParticipant.jockey.color || 0xffffff;
        console.log(`[RESTORE TINT] Jockey layer ${playerId} -> 0x${jockeyLayer.tint.toString(16)}`);
      } else {
        console.log(`[RESTORE TINT] No jockey layer for ${playerId} (expected if no jockey sprite)`);
      }
    }
  };

  const startRace = () => {
    console.log("startRace called", {
      hasApp: !!appRef.current,
      hasInputs: !!raceInputs,
    });
    if (!appRef.current || !raceInputs) {
      console.error("Missing app or inputs:", {
        hasApp: !!appRef.current,
        hasInputs: !!raceInputs,
      });
      return;
    }

    console.log("Clearing existing horses...");
    // Clear existing horses
    horsesRef.current.forEach((horse) => {
      appRef.current!.stage.removeChild(horse.container);
    });
    horsesRef.current.clear();
    finishersRef.current.clear();
    setLiveStandings([]);

    console.log(
      "Creating simulator with",
      raceInputs.entries.length,
      "entries"
    );
    console.log("Race seed:", raceInputs.seed);

    // Build participants exactly as they'll be passed to simulator
    const participants = raceInputs.entries.map((entry) => ({
      playerId: entry.playerId,
      playerName: entry.playerName,
      horse: entry.horse,
      jockey: entry.jockey,
      equipment: entry.equipment || {},
      strategy: entry.strategy || {
        start: "steady",
        mid: "react",
        finish: "maintain",
      },
      bloodlineBonuses: (entry as any).bloodlineBonuses || undefined,
    }));

    // Removed verbose simulator input logging - we confirmed it matches server

    // Create simulator
    const simulator = new RaceSimulator({
      track: raceInputs.track as any,
      participants: participants as any,
      seed: raceInputs.seed || "default-seed",
    });
    simulatorRef.current = simulator;

    // Get race distance and redraw track with correct length
    const raceDistanceMeters = simulator.getRaceDistance();
    console.log("Redrawing track for race distance:", raceDistanceMeters, "meters");
    appRef.current.stage.removeChildren();
    drawTrack(appRef.current, raceDistanceMeters, raceInputs.track.surface);

    // Create horse sprites
    console.log("Creating horse sprites...");
    raceInputs.entries.forEach((entry: any, index: number) => {
      console.log(`Creating sprite for ${entry.playerName} in lane ${index}`);
      const horse = createHorseSprite(
        {
          playerId: entry.playerId,
          playerName: entry.playerName,
          horse: entry.horse,
          jockey: entry.jockey,
          equipment: entry.equipment || {},
          strategy: entry.strategy || {
            start: "steady",
            mid: "react",
            finish: "sprint",
          },
        } as RaceParticipant,
        index
      );
      horsesRef.current.set(entry.playerId, horse);
      trackContainerRef.current!.addChild(horse.container);
      console.log(`[PIXI] Added ${entry.playerName} to track container`, {
        position: horse.container.position,
        stageChildren: appRef.current!.stage.children.length,
        containerChildren: horse.container.children.length,
        visible: horse.container.visible,
        alpha: horse.container.alpha
      });
    });

    console.log("Starting animation loop...");
    // Start animation loop
    animate();
  };

  const animate = () => {
    console.log("animate() called", {
      hasSimulator: !!simulatorRef.current,
      hasApp: !!appRef.current,
    });
    if (!simulatorRef.current || !appRef.current) {
      console.error("Missing simulator or app in animate");
      return;
    }

    const simulator = simulatorRef.current;
    const app = appRef.current;

    // Get race distance in meters
    const raceDistanceMeters = simulator.getRaceDistance();
    console.log("Race distance:", raceDistanceMeters, "meters");

    // Run simulation tick by tick and animate
    const tickInterval = 20; // 20ms between ticks (50 ticks/second, 5x speed)

    console.log("Setting up interval with", tickInterval, "ms");
    const raceInterval = setInterval(() => {
      // Advance simulation by one tick
      const raceOngoing = simulator.advanceTick();

      // Get current state after tick
      const state = simulator.getCurrentState();

      // Update current tick for display
      setCurrentTick(state.tick);

      // Send live events to parent if callback provided
      if (onRaceEvent) {
        const outcome = simulator.getOutcome();
        const formattedEvents = outcome.events.map(e => ({
          tick: e.tick,
          playerId: e.playerId,
          playerName: raceInputs.entries.find(entry => entry.playerId === e.playerId)?.playerName || e.playerId,
          type: e.type as string,
          description: e.description,
        }));
        onRaceEvent(formattedEvents);
      }

      // Collect new events
      const newEvents: RaceEvent[] = [];
      state.participants.forEach((p) => {
        if (p.events && p.events.length > 0) {
          const participant = raceInputs.entries.find(
            (e: any) => e.playerId === p.playerId
          );
          p.events.forEach((eventDesc) => {
            newEvents.push({
              tick: state.tick,
              playerId: p.playerId,
              playerName: participant?.playerName || p.playerId,
              type: eventDesc.includes("Stumbled") ? "stumble" : "event",
              description: eventDesc,
            });
          });
        }
      });

      if (newEvents.length > 0) {
        setRaceEvents((prev) => [...newEvents, ...prev].slice(0, 10)); // Keep last 10 events

        // Add visual effects for surge events
        newEvents.forEach((event) => {
          if (event.type === 'surge') {
            const horse = horsesRef.current.get(event.playerId);
            if (horse) {
              // Create a speed boost visual effect
              // Scale up briefly
              const originalScale = horse.container.scale.x;
              horse.container.scale.set(originalScale * 1.2);

              // Add a yellow glow/tint
              applyHorseTint(horse, 0xffff00); // Yellow tint for surge

              // Reset after 300ms
              setTimeout(() => {
                horse.container.scale.set(originalScale);
                restoreOriginalTint(horse, event.playerId);
              }, 300);
            }
          }
        });
      }

      // Sort participants by actual finish order for visual accuracy
      const finishedParticipants = state.participants.filter(p => p.finishTick !== null);
      const runningParticipants = state.participants.filter(p => p.finishTick === null);

      // Sort finished participants by their actual finish order
      finishedParticipants.sort((a, b) => {
        if (a.finishTick !== b.finishTick) return a.finishTick! - b.finishTick!;
        // If same tick, use exact finish position
        return (b.finishPosition || b.position) - (a.finishPosition || a.position);
      });

      // Update horse positions
      state.participants.forEach((p) => {
        const horse = horsesRef.current.get(p.playerId);
        if (!horse) return;

        // Calculate target X position based on actual distance covered in meters
        const trackLengthPixels = raceDistanceMeters * METERS_TO_PIXELS;
        let targetPosition = p.position * METERS_TO_PIXELS;

        // For finished horses, keep them at the finish line
        if (p.finishTick !== null) {
          // Keep finished horses at the finish line
          targetPosition = trackLengthPixels;
        }

        horse.targetX = TRACK_PADDING + targetPosition;

        // Track finishers
        if (p.finishTick !== null && !finishersRef.current.has(p.playerId)) {
          finishersRef.current.add(p.playerId);
        }

        // Update status and visual effects for stumbles
        // Log stumble state for debugging
        if (p.isStumbled || horse.isStumbled) {
          console.log(`[STUMBLE] ${p.playerId} - sim:${p.isStumbled}, local:${horse.isStumbled}`);
        }

        if (p.isStumbled) {
          if (!horse.isStumbled) {
            // Horse just stumbled - add visual effects
            console.log(`[STUMBLE START] ${p.playerId} stumbled!`);
            horse.statusText.text = "STUMBLED!";
            horse.statusText.visible = true;
            horse.isStumbled = true;

            // Add stumble animation: tilt the sprite
            horse.container.rotation = Math.PI / 12; // Tilt 15 degrees

            // Flash red briefly
            applyHorseTint(horse, 0xff6666);
          }
        } else if (horse.isStumbled) {
          // Horse recovered from stumble - restore normal state
          console.log(`[STUMBLE RECOVERY] ${p.playerId} recovering, isStumbled in sim: ${p.isStumbled}`);
          horse.statusText.text = "";
          horse.statusText.visible = false;
          horse.isStumbled = false;

          // Remove tilt
          horse.container.rotation = 0;

          // Restore original color/tint
          console.log(`[STUMBLE RECOVERY] Calling restoreOriginalTint for ${horse.playerId}`);
          restoreOriginalTint(horse, horse.playerId);
        }
      });

      // Update live standings (sorted by finish time, then distance)
      // This matches the logic in RaceSimulator.generateOutcome()
      const sortedParticipants = [...state.participants].sort((a, b) => {
        // If both finished, compare finish ticks
        if (a.finishTick !== null && b.finishTick !== null) {
          const tickDiff = a.finishTick - b.finishTick;
          // If they finished on the same tick, use exact finish position
          if (tickDiff === 0) {
            return (b.finishPosition || b.position) - (a.finishPosition || a.position);
          }
          return tickDiff;
        }
        // If only one finished, they win
        if (a.finishTick !== null) return -1;
        if (b.finishTick !== null) return 1;
        // If neither finished, sort by distance
        return b.position - a.position;
      });

      setLiveStandings(sortedParticipants.map((p, index) => {
        const entry = raceInputs.entries.find(e => e.playerId === p.playerId);
        return {
          playerId: p.playerId,
          playerName: entry?.playerName || 'Unknown',
          horseName: entry?.horse?.name || 'Unknown',
          position: index + 1, // 1st, 2nd, 3rd, etc.
          isFinished: p.finishTick !== null,
          distance: p.position,
        };
      }));

      // Smooth interpolation of positions and animate sprites
      horsesRef.current.forEach((horse) => {
        // Check if this horse has finished
        const participant = state.participants.find(p => p.playerId === horse.playerId);
        const hasFinished = participant?.finishTick !== null;

        // For finished horses, snap to exact position (no interpolation)
        // For running horses, use high lerp factor for accurate positioning
        if (hasFinished) {
          horse.currentX = horse.targetX; // Instant snap for finished horses
        } else {
          horse.currentX += (horse.targetX - horse.currentX) * 0.9; // Higher lerp for better accuracy
        }
        horse.container.position.x = horse.currentX;

        // Animate galloping frames for all horses (except stumbled ones)
        // Check if horse has finished
        const horseParticipant = state.participants.find(p => p.playerId === horse.playerId);
        const horseFinished = horseParticipant?.finishTick !== null;

        // Animate if not stumbled and not finished
        const shouldAnimate = !horse.isStumbled && !horseFinished;
        if (shouldAnimate) {
          // Generate dust particles behind running horses
          horse.particleTimer += tickInterval;
          if (horse.particleTimer >= 100 && trackContainerRef.current) { // Create particle every 100ms
            horse.particleTimer = 0;

            // Create a small dust particle
            const particle = new PIXI.Graphics();
            const size = 3 + Math.random() * 4; // Random size 3-7px
            particle.circle(0, 0, size);
            particle.fill(0x8b6f47); // Brownish dust color
            particle.alpha = 0.6;

            // Position behind the horse
            particle.x = horse.container.x - HORSE_WIDTH / 2;
            particle.y = horse.container.y + (Math.random() * 20 - 10); // Random vertical offset

            trackContainerRef.current.addChild(particle);
            horse.particles.push(particle);

            // Animate particle (fade out and drift back)
            const particleVelocity = -2; // Move backward
            const fadeSpeed = 0.02;

            const animateParticle = () => {
              particle.x += particleVelocity;
              particle.alpha -= fadeSpeed;

              if (particle.alpha <= 0) {
                // Remove particle when fully faded
                trackContainerRef.current?.removeChild(particle);
                const index = horse.particles.indexOf(particle);
                if (index > -1) {
                  horse.particles.splice(index, 1);
                }
              } else {
                requestAnimationFrame(animateParticle);
              }
            };
            animateParticle();
          }

          // Update animation timer (cycle every 50ms for smooth galloping - 16 frames)
          horse.animationTimer += tickInterval;
          if (horse.animationTimer >= 50) {
            horse.animationTimer = 0;
            horse.animationFrame = (horse.animationFrame + 1) % 16; // 16 frames total (4x4 grid)

            // Try to use SpriteManager's updateCompositeFrame for composite sprites
            if (spriteManagerRef.current && horse.body instanceof PIXI.Container) {
              // Get the original participant data from raceInputs (has horse/jockey info)
              const originalParticipant = raceInputs?.entries.find(e => e.playerId === horse.playerId);
              if (originalParticipant) {
                try {
                  spriteManagerRef.current.updateCompositeFrame(
                    horse.body,
                    {
                      horseType: originalParticipant.horse.variant || 'regular',
                      bloodline: originalParticipant.horse.bloodline,
                      jockeyStyle: originalParticipant.jockey.style || 'classic',
                      jockeyColor: originalParticipant.jockey.color
                    },
                    horse.animationFrame
                  );
                } catch (error) {
                  // Fallback to legacy sprite animation if composite update fails
                  console.warn('[PIXI] Composite frame update failed, using legacy:', error);
                }
              }
            }

            // Legacy sprite animation (fallback or if not using composite)
            if (horse.body instanceof PIXI.Sprite && gallopingSpriteTextureRef.current) {
              const SPRITE_WIDTH = 64;
              const SPRITE_HEIGHT = 64;
              const FRAMES_PER_ROW = 4;

              // Calculate row and column from frame number
              const row = Math.floor(horse.animationFrame / FRAMES_PER_ROW);
              const col = horse.animationFrame % FRAMES_PER_ROW;

              horse.body.texture = new PIXI.Texture({
                source: gallopingSpriteTextureRef.current.source,
                frame: new PIXI.Rectangle(
                  col * SPRITE_WIDTH,
                  row * SPRITE_HEIGHT,
                  SPRITE_WIDTH,
                  SPRITE_HEIGHT
                ),
              });
            }
          }
        }
      });

      // Update camera to follow the player's horse (or lead pack if player not found)
      if (trackContainerRef.current && state.participants.length > 0) {
        let targetPosition: number;

        // Try to find the player's horse
        const playerHorse = playerId
          ? state.participants.find(p => p.playerId === playerId)
          : null;

        if (playerHorse) {
          // Follow the player's horse
          targetPosition = playerHorse.position;
        } else {
          // Fallback: follow the average position of the top 3 horses
          const sortedByPosition = [...state.participants].sort((a, b) => b.position - a.position);
          const leadPack = sortedByPosition.slice(0, Math.min(3, sortedByPosition.length));
          targetPosition = leadPack.reduce((sum, p) => sum + p.position, 0) / leadPack.length;
        }

        // Convert to pixels and add padding
        const targetCameraX = targetPosition * METERS_TO_PIXELS + TRACK_PADDING;

        // Keep camera centered on the target, with some padding ahead
        // Camera target should keep the horse in the center-left of screen
        const idealCameraOffset = targetCameraX - (CANVAS_WIDTH * 0.3);

        // Clamp camera so we don't show before start or too far past finish
        const trackLengthPixels = raceDistanceMeters * METERS_TO_PIXELS;
        const maxCameraX = trackLengthPixels - (CANVAS_WIDTH * 0.7); // Stop slightly past finish line
        cameraRef.current.targetX = Math.max(0, Math.min(idealCameraOffset, maxCameraX));

        // Smooth camera movement
        cameraRef.current.x += (cameraRef.current.targetX - cameraRef.current.x) * 0.15;

        // Apply camera position to track container (negative because we're moving the world)
        trackContainerRef.current.position.x = -cameraRef.current.x;

        // Parallax effect on backgrounds (moves slower than camera)
        if (farBackgroundRef.current) {
          farBackgroundRef.current.position.x = -cameraRef.current.x * 0.2; // 20% camera movement
        }
        if (midBackgroundRef.current) {
          midBackgroundRef.current.position.x = -cameraRef.current.x * 0.5; // 50% camera movement
        }
      }

      // Check if race is complete
      if (!raceOngoing) {
        clearInterval(raceInterval);

        // Small delay to show final positions before showing results
        setTimeout(() => {
          const result = simulator.getOutcome();
          console.log('[Race Complete] Final placements:', result.placements.map(p => ({
            position: p.position,
            playerName: p.playerName,
            finishTime: p.finishTime,
            distance: p.distance
          })));
          onRaceComplete({
            placements: result.placements,
            events: result.events,
          });
        }, 500);
      }
    }, tickInterval);
  };

  const cleanup = () => {
    console.log("Cleanup called");

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
    }

    horsesRef.current.clear();
    simulatorRef.current = null;
    setIsInitialized(false);
    setCurrentTick(0);
    setRaceEvents([]);

    // Clear canvas container
    if (canvasRef.current) {
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Section: Track + Standings/Horses (side by side on desktop, stacked on mobile) */}
      <div className="flex flex-col-reverse md:flex-row gap-4">
        {/* Race Track Section */}
        <div className="flex-1">
          <div className="flex flex-col gap-2 items-center">
            <TrackInfo track={raceInputs.track} maxWidth={CANVAS_WIDTH} />
            <RaceCanvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              isInitialized={isInitialized}
              currentTick={currentTick}
            />
          </div>
        </div>

        {/* Right Panel: Tabbed Standings/Horses */}
        <RaceSidebar liveStandings={liveStandings} entries={raceInputs.entries} />
      </div>

      {/* Bottom Section: Event Log (full width) */}
      <RaceEventLog events={raceEvents} />
    </div>
  );
}
