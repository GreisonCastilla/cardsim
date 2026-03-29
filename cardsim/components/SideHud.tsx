"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface SideHudProps {
  pid: PlayerId;
  f: boolean;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  setViewingZone: (state: any) => void;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
}

export function SideHud({
  pid,
  f,
  zones,
  cards,
  setViewingZone,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
}: SideHudProps) {
  const rot = f ? "rotate-180" : "";

  const renderHUDZone = (key: string) => {
    const labels: Record<string, string> = { hyperspatial: 'HS', mainDeck: 'DECK', cemetery: 'GY', banishZone: 'ABBYS', gZone: 'G' };
    const zoneKey = (key === 'mainDeck' ? `${pid}_mainDeck` : `${pid}_${key}`) as ZoneName;
    const topCardId = zones[zoneKey].length > 0 ? zones[zoneKey][zones[zoneKey].length - 1] : null;
    const isPublic = ['cemetery', 'hyperspatial', 'banishZone', 'gZone'].includes(key);

    return (
      <DroppableZone
        key={key}
        id={zoneKey}
        title=""
        compact
        label={labels[key]}
        count={zones[zoneKey].length}
        onView={isPublic ? () => setViewingZone({ zone: zoneKey, mode: "full" }) : undefined}
      >
        {topCardId && (
          <div className={cn("absolute inset-0 p-1", rot)}>
            <Card
              card={cards[topCardId]}
              zone={zoneKey}
              onHover={(c) => handleCardHover(c, zoneKey)}
              onLeave={() => handleCardHover(null)}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
            />
          </div>
        )}
      </DroppableZone>
    );
  };

  return (
    <>
      {/* Extra Decks Row (Submerged, Edge Left) */}
      <div className="absolute bottom-0 left-4 flex gap-1.5 z-[900] pointer-events-none">
        {['hyperspatial', 'gZone'].map(key => (
          <div
            key={key}
            className="pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] translate-y-[55%] hover:-translate-y-[calc(-55%+4px)] hover:scale-105 hover:z-[950] opacity-100 drop-shadow-2xl"
          >
            {renderHUDZone(key)}
          </div>
        ))}
      </div>

      {/* Main Flow Row (Submerged, Edge Right) */}
      <div className="absolute bottom-0 right-4 flex gap-1.5 z-[900] pointer-events-none">
        {['mainDeck', 'cemetery', 'banishZone'].map(key => (
          <div
            key={key}
            className="pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] translate-y-[55%] hover:-translate-y-[calc(-55%+4px)] hover:scale-105 hover:z-[950] opacity-100 drop-shadow-2xl"
          >
            {renderHUDZone(key)}
          </div>
        ))}
      </div>
    </>
  );
}
