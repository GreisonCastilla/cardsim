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
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  handleDeckClick: (pid: PlayerId) => void;
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
  handleContextMenu,
  handleDeckClick,
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
        onContextMenu={(e) => {
           if (key === 'mainDeck' || key === 'cemetery' || key === 'hyperspatial' || key === 'gZone' || key === 'banishZone') {
             const dummyCard = topCardId ? cards[topCardId] : { id: 'empty', owner: pid } as GameCard;
             handleContextMenu(e, dummyCard, zoneKey);
           }
        }}
        onClick={() => {
          if (key === 'mainDeck') handleDeckClick(pid);
        }}
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
              onContextMenu={handleContextMenu}
            />
          </div>
        )}
      </DroppableZone>
    );
  };


  return (
    <>
      <div className="absolute bottom-2 right-4 flex gap-4 items-end z-[900] pointer-events-none">
        {/* Widgets removed as they were moved to ResourceArea */}
      </div>
    </>
  );
}
