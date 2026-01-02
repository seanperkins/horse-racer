"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import type { RaceParticipant } from "@/types/game";
import type { RaceInputs } from "@/types/messages";
import { RaceSimulator } from "@/game/simulation/RaceSimulator";
import { TrackInfo, RaceCanvas, RaceSidebar, RaceEventLog } from "./race";

interface PixiRaceRendererProps {
  raceInputs: RaceInputs;
  onRaceComplete: (result: { placements: any[]; events: any[] }) => void;
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
  body: PIXI.Graphics;
  nameText: PIXI.Text;
  statusText: PIXI.Text;
  playerId: string;
  lane: number;
  targetX: number;
  currentX: number;
  isStumbled: boolean;
}

export function PixiRaceRenderer({
  raceInputs,
  onRaceComplete,
}: PixiRaceRendererProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const horsesRef = useRef<Map<string, HorseSprite>>(new Map());
  const simulatorRef = useRef<RaceSimulator | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [currentTick, setCurrentTick] = useState(0);
  const [podium, setPodium] = useState<
    Array<{ playerId: string; playerName: string }>
  >([]);
  const finishersRef = useRef<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 });

  // Race configuration (responsive)
  const CANVAS_WIDTH = canvasSize.width;
  const CANVAS_HEIGHT = canvasSize.height;
  const LANE_HEIGHT = Math.max(40, CANVAS_HEIGHT / 10);
  const TRACK_PADDING = 20;
  const HORSE_WIDTH = Math.max(30, CANVAS_WIDTH / 30);
  const HORSE_HEIGHT = Math.max(30, CANVAS_WIDTH / 30);
  const TRACK_LENGTH_PIXELS = CANVAS_WIDTH - TRACK_PADDING * 2;

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
      appRef.current.stage.removeChildren();
      drawTrack(appRef.current);

      // Recreate horses if race is running
      if (simulatorRef.current && raceInputs) {
        horsesRef.current.forEach((horse) => {
          appRef.current!.stage.addChild(horse.container);
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

    // Draw track
    drawTrack(app);
  };

  const drawTrack = (app: PIXI.Application) => {
    const trackGraphics = new PIXI.Graphics();

    // Draw track background
    trackGraphics.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    trackGraphics.fill(0x2a4a2a);

    // Draw racing lanes
    const numLanes = 8;
    const laneY = TRACK_PADDING;

    for (let i = 0; i <= numLanes; i++) {
      const y = laneY + i * LANE_HEIGHT;
      trackGraphics.moveTo(TRACK_PADDING, y);
      trackGraphics.lineTo(CANVAS_WIDTH - TRACK_PADDING, y);
    }
    trackGraphics.stroke({ width: 2, color: 0x4a6a4a, alpha: 0.5 });

    // Draw start line
    trackGraphics.rect(
      TRACK_PADDING - 5,
      TRACK_PADDING,
      5,
      numLanes * LANE_HEIGHT
    );
    trackGraphics.fill(0xffffff);

    // Draw finish line (checkered pattern)
    const finishX = CANVAS_WIDTH - TRACK_PADDING;
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

    app.stage.addChild(trackGraphics);
  };

  const createHorseSprite = (
    participant: RaceParticipant,
    lane: number
  ): HorseSprite => {
    const container = new PIXI.Container();

    // Horse body (simple geometric representation)
    const body = new PIXI.Graphics();

    // Draw horse as rounded rectangle with head
    const horseColor = getHorseColor(participant.horse.bloodline);
    body.roundRect(
      -HORSE_WIDTH / 2,
      -HORSE_HEIGHT / 2,
      HORSE_WIDTH,
      HORSE_HEIGHT,
      8
    );
    body.fill(horseColor);

    // Draw simple head
    body.circle(HORSE_WIDTH / 2 - 5, 0, 12);
    body.fill(horseColor);

    // Add white eye
    body.circle(HORSE_WIDTH / 2 - 2, -3, 3);
    body.fill(0xffffff);

    container.addChild(body);

    // Player name above horse
    const nameText = new PIXI.Text({
      text: participant.playerName || participant.playerId.slice(0, 8),
      style: {
        fontFamily: "Arial",
        fontSize: 12,
        fontWeight: "bold",
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    nameText.anchor.set(0.5, 1);
    nameText.position.set(0, -HORSE_HEIGHT / 2 - 5);
    container.addChild(nameText);

    // Status text below horse (for stumbles, etc.)
    const statusText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "Arial",
        fontSize: 10,
        fill: 0xff4444,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    statusText.anchor.set(0.5, 0);
    statusText.position.set(0, HORSE_HEIGHT / 2 + 5);
    container.addChild(statusText);

    // Initial position
    const laneY = TRACK_PADDING + lane * LANE_HEIGHT + LANE_HEIGHT / 2;
    container.position.set(TRACK_PADDING, laneY);

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
    setPodium([]);

    console.log(
      "Creating simulator with",
      raceInputs.entries.length,
      "entries"
    );
    // Create simulator
    const simulator = new RaceSimulator({
      track: raceInputs.track as any,
      participants: raceInputs.entries.map((entry) => ({
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
        bloodlineBonuses: entry.bloodlineBonuses || undefined,
      })) as any,
      seed: raceInputs.seed || "default-seed",
    });
    simulatorRef.current = simulator;

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
      appRef.current!.stage.addChild(horse.container);
      console.log(
        `Horse sprite created at position:`,
        horse.container.position
      );
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
      console.log("Interval tick running...");
      // Advance simulation by one tick
      const raceOngoing = simulator.advanceTick();
      console.log("Race ongoing:", raceOngoing);

      // Get current state after tick
      const state = simulator.getCurrentState();

      // Update current tick for display
      setCurrentTick(state.tick);

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
      }

      // Update horse positions
      state.participants.forEach((p) => {
        const horse = horsesRef.current.get(p.playerId);
        if (!horse) return;

        // Calculate target X position based on distance covered
        const progress = p.position / raceDistanceMeters;

        // Stop at finish line (progress = 1.0)
        horse.targetX =
          TRACK_PADDING + Math.min(progress, 1.0) * TRACK_LENGTH_PIXELS;

        // Check if horse just crossed finish line
        if (progress >= 1.0 && !finishersRef.current.has(p.playerId)) {
          finishersRef.current.add(p.playerId);
          const participant = raceInputs.entries.find(
            (e: any) => e.playerId === p.playerId
          );
          if (participant && finishersRef.current.size <= 3) {
            setPodium((prev) => [
              ...prev,
              { playerId: p.playerId, playerName: participant.playerName },
            ]);
          }
        }

        // Update status
        if (p.isStumbled) {
          horse.statusText.text = "STUMBLED!";
          horse.isStumbled = true;
        } else if (horse.isStumbled) {
          horse.statusText.text = "";
          horse.isStumbled = false;
        }
      });

      // Smooth interpolation of positions
      horsesRef.current.forEach((horse) => {
        // Lerp current position toward target
        horse.currentX += (horse.targetX - horse.currentX) * 0.3;
        horse.container.position.x = horse.currentX;

        // Bobbing animation when moving
        if (!horse.isStumbled && horse.targetX > horse.currentX + 1) {
          const bob = Math.sin(Date.now() * 0.01) * 3;
          horse.body.position.y = bob;
        } else {
          horse.body.position.y = 0;
        }
      });

      // Check if race is complete
      if (!raceOngoing) {
        clearInterval(raceInterval);

        // Small delay to show final positions before showing results
        setTimeout(() => {
          const result = simulator.getOutcome();
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
        <RaceSidebar podium={podium} entries={raceInputs.entries} />
      </div>

      {/* Bottom Section: Event Log (full width) */}
      <RaceEventLog events={raceEvents} />
    </div>
  );
}
