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
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
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
  handleContextMenu,
}: HandOverlayProps) {
  const rot = flipped ? "rotate-180" : "";
  const isMenuOpenForHand = placementMenu?.fromZone === `${pid}_hand`;
  const zoneKey = `${pid}_hand` as ZoneName;
  const cardIds = zones[zoneKey] || [];
  const cardCount = cardIds.length;

  // Base overlap is 0.9rem (exactly 20% of the card width 4.5rem)
  let overlapRem = 0.9;
  if (cardCount > 5) {
    overlapRem = Math.min(3.2, 0.9 + (cardCount - 5) * 0.18);
  }

  const isExpanded = hoveredHand === pid || isMenuOpenForHand;

  return (
    <div
      className={cn(
        "absolute left-0 w-full z-[1000] flex flex-col items-center pointer-events-none transition-all duration-300 ease-out overflow-visible",
        flipped ? "top-0 rotate-180" : "bottom-0",
        !isExpanded
          ? (flipped ? "-translate-y-[52%] opacity-100 scale-95" : "translate-y-[52%] opacity-100 scale-95")
          : (flipped ? "-translate-y-[5%] opacity-100 scale-100" : "translate-y-[5%] opacity-100 scale-100")
      )}
    >
      <DroppableZone id={zoneKey} title="" className="w-fit pointer-events-auto transition-all duration-300" invisible count={cardIds.length}>
        <div
          className={cn(
            "relative flex items-center justify-center transition-all duration-300",
            "bg-slate-900/30 backdrop-blur-xl border-x border-t border-white/[0.06] rounded-t-2xl shadow-2xl cursor-pointer",
            "px-4 pb-2 pt-4 max-w-[calc(100vw-32rem)]",
            isExpanded ? "bg-slate-900/50 border-white/[0.1] ring-1 ring-white/[0.03]" : ""
          )}
          onMouseEnter={() => setHoveredHand(pid)}
          onMouseLeave={() => setHoveredHand(null)}
        >
          {cardIds.length === 0 ? (
            <div className="px-8 py-3 text-[9px] font-black text-white/[0.04] uppercase tracking-[0.3em]">Mano Vacía</div>
          ) : (
            <div className="flex items-center justify-center pointer-events-auto flex-nowrap">
              {cardIds.map((id, idx) => (
                <div
                  key={id}
                  className={cn(
                    "relative transition-all duration-300 hover:-translate-y-5 hover:scale-110 hover:z-[510] w-[4.5rem] pointer-events-auto cursor-pointer",
                    placementMenu?.card?.id === id ? "ring-2 ring-blue-500/50 -translate-y-3" : ""
                  )}
                  style={{
                    marginRight: idx < cardIds.length - 1 ? `-${overlapRem}rem` : undefined
                  }}
                >
                  <div className={cn(rot, "pointer-events-auto")}>
                    <Card
                      card={cards[id]}
                      zone={zoneKey}
                      onHover={(c) => handleCardHover(c, zoneKey)}
                      onLeave={() => handleCardHover(null)}
                      onClick={handleCardClick}
                      onDoubleClick={handleCardDoubleClick}
                      onContextMenu={handleContextMenu}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DroppableZone>
    </div>
  );
}
