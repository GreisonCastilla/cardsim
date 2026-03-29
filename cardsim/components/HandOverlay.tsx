"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface HandOverlayProps {
  pid: PlayerId;
  flipped?: boolean;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  activeCard: GameCard | null;
  hoveredHand: PlayerId | null;
  setHoveredHand: (pid: PlayerId | null) => void;
  placementMenu: any;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
}

export function HandOverlay({
  pid,
  flipped = false,
  zones,
  cards,
  activeCard,
  hoveredHand,
  setHoveredHand,
  placementMenu,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
}: HandOverlayProps) {
  const rot = flipped ? "rotate-180" : "";
  const isMenuOpenForHand = placementMenu?.fromZone === `${pid}_hand`;
  const zoneKey = `${pid}_hand` as ZoneName;

  return (
    <div
      className={cn(
        "absolute left-0 w-full z-[1000] flex flex-col items-center pointer-events-none transition-all duration-300 ease-out overflow-visible",
        flipped ? "top-4 rotate-180" : "bottom-4",
        (!hoveredHand || hoveredHand !== pid) && activeCard?.owner !== pid && !isMenuOpenForHand
          ? (flipped ? "-translate-y-1/2 opacity-100 scale-95" : "translate-y-1/2 opacity-100 scale-95")
          : (flipped ? "-translate-y-[20%] opacity-100 scale-100" : "translate-y-[20%] opacity-100 scale-100")
      )}
      style={{ height: '140px' }}
    >
      <DroppableZone id={zoneKey} title="" className="min-w-[160px] w-fit px-12 h-full bg-transparent pointer-events-auto transition-all duration-300" invisible count={zones[zoneKey].length}>
        <div className="flex items-end justify-center w-full h-full pb-2 pointer-events-none">
          {zones[zoneKey].map((id, idx) => (
            <div
              key={id}
              onMouseEnter={() => setHoveredHand(pid)}
              onMouseLeave={() => setHoveredHand(null)}
              className={cn(
                "relative transition-all duration-200 hover:-translate-y-6 hover:scale-110 hover:z-[510] w-14 group cursor-pointer pointer-events-auto",
                idx > 0 ? "-ml-6" : "",
                placementMenu?.card.id === id ? "ring-2 ring-blue-500/50 -translate-y-4" : ""
              )}
            >
              <div className={rot}>
                <Card
                  card={cards[id]}
                  zone={zoneKey}
                  onHover={(c) => handleCardHover(c, zoneKey)}
                  onLeave={() => handleCardHover(null)}
                  onClick={handleCardClick}
                  onDoubleClick={handleCardDoubleClick}
                />
              </div>
            </div>
          ))}
        </div>
      </DroppableZone>
    </div>
  );
}
