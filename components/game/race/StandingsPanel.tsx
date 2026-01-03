'use client'

import { useEffect, useRef } from 'react';

interface StandingsPanelProps {
  liveStandings: Array<{
    playerId: string;
    playerName: string;
    horseName: string;
    position: number;
    isFinished: boolean;
    distance: number;
  }>;
}

export function StandingsPanel({ liveStandings }: StandingsPanelProps) {
  const medals = ['🏆', '🥈', '🥉'];
  const previousPositionsRef = useRef<Map<string, number>>(new Map());

  // Track position changes for animations
  useEffect(() => {
    const newPositions = new Map<string, number>();
    liveStandings.forEach((standing) => {
      newPositions.set(standing.playerId, standing.position);
    });
    previousPositionsRef.current = newPositions;
  }, [liveStandings]);

  return (
    <div className="relative space-y-2">
      {liveStandings.map((standing, index) => {
        const isFirst = index === 0;
        const isTopThree = index < 3;
        // Only show medals if the horse has finished
        const medal = isTopThree && standing.isFinished ? medals[index] : null;

        return (
          <div
            key={standing.playerId}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ease-out ${
              isFirst
                ? 'bg-yellow-900/30 border-2 border-yellow-500'
                : 'th-panel'
            }`}
          >
            <div className="flex items-center gap-2 min-w-15">
              {medal && (
                <div className={isFirst ? 'text-2xl' : 'text-xl'}>
                  {medal}
                </div>
              )}
              <div className="font-bold text-lg">#{standing.position}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {standing.horseName}
                {standing.isFinished && (
                  <span className="ml-2 text-xs text-green-400">✓ FINISHED</span>
                )}
              </div>
              <div className="text-xs th-label truncate">
                @{standing.playerName}
              </div>
              <div className="text-xs th-label mt-1">
                {standing.distance.toFixed(0)}m
              </div>
            </div>
          </div>
        );
      })}
      {liveStandings.length === 0 && (
        <div className="text-center th-label py-8">Waiting for race to start...</div>
      )}
    </div>
  );
}
