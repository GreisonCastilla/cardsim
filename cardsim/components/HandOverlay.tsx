"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface HandOverlayProps {
  pid: PlayerId;
  flipped?: boolean;
  isOpponent?: boolean; // When true, hide card faces (multiplayer privacy)
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
  isOpponent = false,
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
  const handCount = zones[zoneKey].length;

  // If this is the opponent's hand, show only card backs — no peeking!
  if (isOpponent) {
    return (
      <div
        className={cn(
          "absolute left-0 w-full z-[1000] flex flex-col items-center pointer-events-none transition-all duration-300 ease-out overflow-visible",
          flipped ? "top-4 rotate-180" : "bottom-4",
          "-translate-y-1/2 opacity-90 scale-95"
        )}
        style={{ height: '140px' }}
      >
        <div className="flex items-end justify-center w-full h-full pb-2 pointer-events-none relative">
          {Array.from({ length: handCount }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "relative transition-all duration-200 w-14",
                idx > 0 ? "-ml-6" : ""
              )}
            >
              <div className={rot}>
                {/* Opaque card back — no card data exposed */}
                <div className="w-14 aspect-[3/4] rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 shadow-lg flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-white/10 bg-slate-600/50" />
                </div>
              </div>
            </div>
          ))}
          {/* Card count pill */}
          {handCount > 0 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 border border-white/10 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
              {handCount} cards
            </div>
          )}
        </div>
      </div>
    );
  }

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
