"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface BattleZoneProps {
  pid: PlayerId;
  rot: string;
  zones: Record<string, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  setIsBattleHovered: (hovered: boolean) => void;
}

export function BattleZone({
  pid,
  rot,
  zones,
  cards,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  setIsBattleHovered,
}: BattleZoneProps) {
  const zoneKey = `${pid}_attackZone` as ZoneName;
  
  return (
    <div
      className="relative h-full border-b border-[#00f2ff]/20 backdrop-blur-[16px] overflow-hidden"
      style={{
        backgroundColor: 'rgba(60, 30, 30, 0.18)',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.05) 0%, transparent 70%)'
      }}
      onMouseEnter={() => setIsBattleHovered(true)}
      onMouseLeave={() => setIsBattleHovered(false)}
    >
      <DroppableZone
        id={zoneKey}
        title=""
        label="BATTLE ZONE"
        className="w-full h-full"
        count={zones[zoneKey].length}
      >
        <div className="flex flex-wrap justify-center content-center items-center p-4 gap-3 w-full h-full overflow-y-auto custom-scrollbar relative">
          {zones[zoneKey].map(id => {
            const c = cards[id];
            return (
              <div key={id} 
                   className={cn("shrink-0 w-16 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:z-50", rot, "relative")}>
                <Card
                  card={c}
                  zone={zoneKey}
                  onHover={(cardEvt) => handleCardHover(cardEvt, zoneKey)}
                  onLeave={() => handleCardHover(null)}
                  onClick={handleCardClick}
                  onDoubleClick={handleCardDoubleClick}
                />
              </div>
            )})}
        </div>
      </DroppableZone>
    </div>
  );
}
