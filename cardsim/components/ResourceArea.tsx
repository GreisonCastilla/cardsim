"use client";

import React from "react";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface ResourceAreaProps {
  pid: PlayerId;
  rot: string;
  f: boolean;
  zones: Record<string, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
}

export function ResourceArea({
  pid,
  rot,
  f,
  zones,
  cards,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
}: ResourceAreaProps) {
  const manaKey = `${pid}_manaZone` as ZoneName;
  const shieldKey = `${pid}_shields` as ZoneName;

  return (
    <div className="flex relative h-full overflow-visible">
      {/* Mana Zone (Izquierda 50%) */}
      <DroppableZone
        id={manaKey}
        title=""
        label="MANA ZONE"
        className="flex-1 min-w-0 border-r border-[#00ff88]/20 overflow-visible relative backdrop-blur-[16px]"
        style={{
          backgroundColor: 'rgba(20, 50, 40, 0.35)',
          backgroundImage: 'radial-gradient(circle at 0% 100%, rgba(0, 255, 136, 0.08) 0%, transparent 60%)',
          borderTop: f ? 'none' : '1px solid rgba(0, 255, 136, 0.2)',
          borderBottom: f ? '1px solid rgba(0, 255, 136, 0.2)' : 'none'
        }}
        count={zones[manaKey].length}
        manaCards={zones[manaKey]}
        cardsData={cards}
      >
        <div className="absolute inset-0 z-10 flex flex-wrap content-start items-start justify-start px-6 pt-2 pb-2 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300">
          {zones[manaKey].map((id) => {
            const c = cards[id];
            return (
              <div
                key={id}
                onContextMenu={e => handleContextMenu(e, c, manaKey)}
                className={cn(
                  "shrink-0 w-12 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-50 hover:-translate-y-1 group",
                  rot,
                  "relative"
                )}
              >
                <Card
                  card={c}
                  zone={manaKey}
                  onHover={(cardEvt) => handleCardHover(cardEvt, manaKey)}
                  onLeave={() => handleCardHover(null)}
                  onClick={handleCardClick}
                  onDoubleClick={handleCardDoubleClick}
                />
              </div>
            );
          })}
        </div>
      </DroppableZone>

      {/* Shield Zone (Derecha 50%) */}
      <DroppableZone
        id={shieldKey}
        title=""
        label="SHIELD ZONE"
        className="flex-1 min-w-0 relative overflow-visible backdrop-blur-[16px]"
        style={{
          backgroundColor: 'rgba(60, 50, 20, 0.35)',
          backgroundImage: 'radial-gradient(circle at 100% 100%, rgba(255, 204, 0, 0.08) 0%, transparent 60%)',
          borderTop: f ? 'none' : '1px solid rgba(255, 204, 0, 0.2)',
          borderBottom: f ? '1px solid rgba(255, 204, 0, 0.2)' : 'none'
        }}
        count={zones[shieldKey].length}
      >
        <div className="absolute inset-0 z-10 flex flex-wrap content-start items-start justify-start px-6 pt-2 pb-2 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300">
          {zones[shieldKey].map((id) => {
            const c = cards[id];
            return (
              <div
                key={id}
                onContextMenu={e => handleContextMenu(e, c, shieldKey)}
                className={cn(
                  "shrink-0 w-12 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-50 hover:-translate-y-1 group",
                  rot,
                  "relative"
                )}
              >
                <Card
                  card={c}
                  zone={shieldKey}
                  onHover={(cardEvt) => handleCardHover(cardEvt, shieldKey)}
                  onLeave={() => handleCardHover(null)}
                  onClick={handleCardClick}
                  onDoubleClick={handleCardDoubleClick}
                />
              </div>
            );
          })}
        </div>
      </DroppableZone>
    </div>
  );
}
