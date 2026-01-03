"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";

export default function SpriteTestPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spriteRef = useRef<PIXI.Sprite | null>(null);
  const textureRef = useRef<PIXI.Texture | null>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(100);
  const [spriteScale, setSpriteScale] = useState(4);
  const [totalFrames] = useState(16);
  const [spriteSize] = useState(64); // Each sprite is 64x64 in the 256x256 sheet
  const [selectedSpriteSheet, setSelectedSpriteSheet] = useState<'galloping' | 'base-horse' | 'blue' | 'red' | 'blue-rider' | 'red-rider' | 'test-horse' | 'test-horse-jockey' | 'jockey-and-horse' | 'jockey-and-horse-galloping'>('galloping');

  useEffect(() => {
    initPixiApp();
    return () => cleanup();
  }, [selectedSpriteSheet]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed, totalFrames]);

  // Update sprite frame when currentFrame changes
  useEffect(() => {
    if (spriteRef.current && textureRef.current) {
      updateSpriteFrame(currentFrame);
    }
  }, [currentFrame]);

  // Update sprite scale
  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.scale.set(spriteScale);
    }
  }, [spriteScale]);

  const initPixiApp = async () => {
    if (!canvasRef.current) return;

    while (canvasRef.current.firstChild) {
      canvasRef.current.removeChild(canvasRef.current.firstChild);
    }

    const app = new PIXI.Application();
    await app.init({
      width: 800,
      height: 600,
      backgroundColor: 0x2a4a2a,
      antialias: true,
    });

    canvasRef.current.appendChild(app.canvas as HTMLCanvasElement);
    appRef.current = app;

    // Load sprite sheet based on selection
    const spriteSheets: Record<typeof selectedSpriteSheet, string> = {
      galloping: "/sprites/better-galloping.png",
      "base-horse": "/sprites/horses/base/regular-gallop-sheet.png",
      blue: "/sprites/pixellab-horse-blue.png",
      red: "/sprites/pixellab-horse-red.png",
      "blue-rider": "/sprites/pixellab-horse-blue-rider.png",
      "red-rider": "/sprites/pixellab-horse-red-rider.png",
      "test-horse": "/sprites/test-horse-only.png",
      "test-horse-jockey": "/sprites/test-horse-jockey.png",
      "jockey-and-horse": "/sprites/jockey-and-horse.png",
      "jockey-and-horse-galloping": "/sprites/jockey_and_horse_galloping.png"
    };
    const texture = await PIXI.Assets.load(spriteSheets[selectedSpriteSheet]);
    textureRef.current = texture;

    // Create initial sprite
    const sprite = new PIXI.Sprite();
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(400, 300);
    sprite.scale.set(spriteScale);
    spriteRef.current = sprite;

    app.stage.addChild(sprite);

    // Set initial frame
    updateSpriteFrame(0);
  };

  const updateSpriteFrame = (frameNum: number) => {
    if (!spriteRef.current || !textureRef.current) return;

    // For single-frame sprites (blue/red/riders), just show the whole image
    if (selectedSpriteSheet === 'blue' || selectedSpriteSheet === 'red' ||
        selectedSpriteSheet === 'blue-rider' || selectedSpriteSheet === 'red-rider') {
      spriteRef.current.texture = textureRef.current;
      return;
    }

    // For galloping sprite sheet, use frame-based animation
    const FRAMES_PER_ROW = 4;
    const row = Math.floor(frameNum / FRAMES_PER_ROW);
    const col = frameNum % FRAMES_PER_ROW;

    const frameTexture = new PIXI.Texture({
      source: textureRef.current.source,
      frame: new PIXI.Rectangle(
        col * spriteSize,
        row * spriteSize,
        spriteSize,
        spriteSize
      ),
    });

    spriteRef.current.texture = frameTexture;
  };

  const cleanup = () => {
    if (appRef.current) {
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-4">Horse Sprite Tester</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas Section */}
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Preview</h2>
              <div
                ref={canvasRef}
                className="border-2 border-gray-600 rounded"
              />
            </div>

            {/* Frame Grid */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">All Frames</h2>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: totalFrames }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentFrame(i)}
                    className={`aspect-square border-2 rounded p-1 transition-all ${
                      currentFrame === i
                        ? "border-blue-500 bg-blue-900"
                        : "border-gray-600 bg-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-xs text-center">Frame {i}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            {/* Animation Controls */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Animation Controls</h2>

              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    className={`w-full px-4 py-2 rounded font-semibold ${
                      isAnimating
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isAnimating ? "Stop Animation" : "Start Animation"}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Frame: {currentFrame}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={totalFrames - 1}
                    value={currentFrame}
                    onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Animation Speed: {animationSpeed}ms
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={animationSpeed}
                    onChange={(e) =>
                      setAnimationSpeed(parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {(1000 / animationSpeed).toFixed(1)} FPS
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sprite Scale: {spriteScale}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={spriteScale}
                    onChange={(e) => setSpriteScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Display size: {spriteSize * spriteScale}x{spriteSize * spriteScale}px
                  </div>
                </div>
              </div>
            </div>

            {/* Sprite Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Sprite Sheet</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedSpriteSheet('galloping')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'galloping'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Original Galloping (16 frames)
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('base-horse')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'base-horse'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🎨 Base Horse (New System)
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('blue')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'blue'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Pixellab Blue Jockey
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('red')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'red'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  Pixellab Red Jockey
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('blue-rider')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'blue-rider'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🐴 Blue Horse + Jockey
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('red-rider')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'red-rider'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🐴 Red Horse + Jockey
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('jockey-and-horse')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'jockey-and-horse'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🏇 Jockey + Horse (16 frames)
                </button>
                <button
                  onClick={() => setSelectedSpriteSheet('jockey-and-horse-galloping')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    selectedSpriteSheet === 'jockey-and-horse-galloping'
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  🏇 Jockey Galloping (16 frames)
                </button>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Sprite Info</h2>
              <div className="space-y-2 text-sm">
                {selectedSpriteSheet === 'galloping' || selectedSpriteSheet === 'base-horse' ? (
                  <>
                    <div>
                      <span className="text-gray-400">Sprite Sheet:</span> 256x256px
                    </div>
                    <div>
                      <span className="text-gray-400">Grid:</span> 4x4 (16 frames)
                    </div>
                    <div>
                      <span className="text-gray-400">Frame Size:</span> {spriteSize}x{spriteSize}px
                    </div>
                    <div>
                      <span className="text-gray-400">Current Row:</span>{" "}
                      {Math.floor(currentFrame / 4)}
                    </div>
                    <div>
                      <span className="text-gray-400">Current Column:</span>{" "}
                      {currentFrame % 4}
                    </div>
                    {selectedSpriteSheet === 'base-horse' && (
                      <div className="text-gray-400 text-xs pt-2 border-t border-gray-600">
                        ✨ New sprite system - Located in /public/sprites/horses/base/
                        <br/>
                        Part of the layered compositing architecture for horse+jockey combinations.
                        See docs/sprite-integration-guide.md for details.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-400">Sprite Sheet:</span> {
                        selectedSpriteSheet === 'blue-rider' || selectedSpriteSheet === 'red-rider'
                          ? '64x64px'
                          : '48x48px'
                      }
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span> Single frame (static)
                    </div>
                    <div>
                      <span className="text-gray-400">Source:</span> Pixellab AI
                      {(selectedSpriteSheet === 'blue-rider' || selectedSpriteSheet === 'red-rider') &&
                        ' (Map Object)'}
                    </div>
                    <div className="text-gray-400 text-xs pt-2">
                      {(selectedSpriteSheet === 'blue-rider' || selectedSpriteSheet === 'red-rider')
                        ? 'Horse with jockey - transparent background'
                        : 'Animated versions coming soon...'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Quick Presets</h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setAnimationSpeed(100);
                    setIsAnimating(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Slow (100ms)
                </button>
                <button
                  onClick={() => {
                    setAnimationSpeed(50);
                    setIsAnimating(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Fast (50ms)
                </button>
                <button
                  onClick={() => {
                    setAnimationSpeed(30);
                    setIsAnimating(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Very Fast (30ms)
                </button>
                <button
                  onClick={() => {
                    setAnimationSpeed(200);
                    setIsAnimating(true);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Very Slow (200ms)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
