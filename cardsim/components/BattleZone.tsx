"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { ExtraZoneWidget } from "./ExtraZoneWidget";

interface BattleZoneProps {
  pid: PlayerId;
  rot: string;
  zones: Record<string, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
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
  handleContextMenu,
  setIsBattleHovered,
}: BattleZoneProps) {
  const frontKey = `${pid}_attackZone_front` as ZoneName;
  const backKey = `${pid}_attackZone_back` as ZoneName;

  // Combine both zones into a single list for unified display
  const allCardIds = [...(zones[backKey] || []), ...(zones[frontKey] || [])];

  return (
    <div
      className="relative h-full overflow-visible transition-colors duration-500 flex flex-col"
      style={{
        cursor: 'default',
        background: 'rgba(15, 23, 42, 0.3)',
        backdropFilter: 'blur(16px)',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.02) 0%, transparent 70%)'
      }}
      onMouseEnter={() => setIsBattleHovered(true)}
      onMouseLeave={() => setIsBattleHovered(false)}
    >
      {/* Espacio exclusivo de carta - Lado derecho del campo de batalla */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto flex items-center justify-center">
        <ExtraZoneWidget
          pid={pid}
          zones={zones}
          cards={cards}
          handleCardHover={handleCardHover}
          handleCardClick={handleCardClick}
          handleCardDoubleClick={handleCardDoubleClick}
          handleContextMenu={handleContextMenu}
        />
      </div>
      <DroppableZone
        id={frontKey}
        title=""
        className="flex-1 min-h-0 relative"
        count={allCardIds.length}
        showCount={false}
        label="BATTLE ZONE"
        invisible
      >
        <div className={cn(
          "flex flex-wrap content-center items-center justify-center pb-2 gap-4 w-full h-full overflow-visible relative pt-5",
          rot.includes("rotate-180") ? "pl-[6.5rem] pr-4" : "pl-4 pr-[6.5rem]"
        )}>
          <AnimatePresence mode="popLayout">
            {allCardIds.map(id => {
              const c = cards[id];
              if (!c) return null;
              const currentZone = zones[frontKey]?.includes(id) ? frontKey : backKey;

              return (
                <div
                  key={id}
                  className={cn(
                    "shrink-0 relative flex items-center justify-center pointer-events-auto cursor-pointer transition-all duration-300",
                    c.position === 'horizontal' ? "mx-3" : "mx-0",
                    "w-[3.2rem] h-[4.5rem]",
                    "hover:z-50"
                  )}
                >
                  <Card
                    card={c}
                    zone={currentZone}
                    onHover={(cardEvt) => handleCardHover(cardEvt, currentZone)}
                    onLeave={() => handleCardHover(null)}
                    onClick={handleCardClick}
                    onDoubleClick={handleCardDoubleClick}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </DroppableZone>
    </div>
  );
}
