"use client";

import { useState } from "react";
import { StandingsPanel } from "./StandingsPanel";
import { HorsesList } from "./HorsesList";

interface RaceSidebarProps {
  podium: Array<{ playerId: string; playerName: string; horseName: string }>;
  entries: Array<{
    playerId: string;
    playerName: string;
    horse: {
      name: string;
      tier: number;
      stats: {
        speed: number;
        stamina: number;
        grit: number;
      };
    };
    jockey: {
      name: string;
    };
  }>;
}

export function RaceSidebar({ podium, entries }: RaceSidebarProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "horses">(
    "standings"
  );

  return (
    <div className="w-full md:w-80 flex-shrink-0">
      <div className="th-panel-strong rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab("standings")}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "standings"
              ? "bg-yellow-900/30 border-b-2 border-yellow-500 text-white"
              : "th-label hover:bg-gray-800/50"
          }`}
        >
          🏆 Standings
        </button>
        <button
          onClick={() => setActiveTab("horses")}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "horses"
              ? "bg-yellow-900/30 border-b-2 border-yellow-500 text-white"
              : "th-label hover:bg-gray-800/50"
          }`}
        >
          🐴 Horses
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[500px] md:max-h-[600px] overflow-y-auto">
        {activeTab === "standings" ? (
          <StandingsPanel podium={podium} />
        ) : (
          <HorsesList entries={entries} />
        )}
      </div>
      </div>
    </div>
  );
}
