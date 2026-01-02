"use client";

import { forwardRef } from "react";

interface RaceCanvasProps {
  width: number;
  height: number;
  isInitialized: boolean;
  currentTick: number;
}

export const RaceCanvas = forwardRef<HTMLDivElement, RaceCanvasProps>(
  ({ width, height, isInitialized, currentTick }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {/* Canvas */}
        <div
          ref={ref}
          className="border-2 md:border-4 border-(--border-color) rounded-lg overflow-hidden shadow-xl w-full"
          style={{
            maxWidth: width,
            height: height,
            display: isInitialized ? "block" : "none",
          }}
        />
        {!isInitialized && (
          <div
            className="border-2 md:border-4 border-(--border-color) rounded-lg overflow-hidden shadow-xl flex items-center justify-center bg-gray-800 w-full"
            style={{ maxWidth: width, height: height }}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🏇</div>
              <div className="th-label">Preparing track...</div>
            </div>
          </div>
        )}
        <div className="text-xs md:text-sm th-label text-center">
          🏁 Watch the race unfold in real-time! | Tick: {currentTick}
        </div>
      </div>
    );
  }
);

RaceCanvas.displayName = "RaceCanvas";
