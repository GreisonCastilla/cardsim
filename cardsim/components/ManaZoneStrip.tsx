"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId, useGameStore } from "../store/gameStore";

interface ManaZoneStripProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  flipped?: boolean;
}

export function ManaZoneStrip({
  pid,
  zones,
  cards,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
  flipped = false,
}: ManaZoneStripProps) {
  const manaKey = `${pid}_manaZone` as ZoneName;
  const manaIds = zones[manaKey] || [];
  const { toggleTapped } = useGameStore();

  const { setNodeRef, isOver } = useDroppable({
    id: manaKey,
    data: { isCard: false, type: "zone", zone: manaKey }
  });

  const manaUntapped = manaIds.filter((id) => cards[id]?.position !== "horizontal").length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex items-center justify-center gap-2 p-4 transition-all duration-300 w-full h-full bg-emerald-950/10 border-b border-white/5 backdrop-blur-sm",
        isOver && "bg-emerald-500/20 ring-2 ring-inset ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        flipped && "rotate-180"
      )}
    >
      <AnimatePresence mode="popLayout">
        {manaIds.map((id, index) => {
          const card = cards[id];
          if (!card) return null;
          const isTapped = card.position === "horizontal";

          return (
            <motion.div
              key={id}
              layoutId={id}
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
              }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              className={cn(
                "relative shrink-0 transition-all duration-300 pointer-events-auto rounded-[4px] cursor-pointer group",
                isTapped ? "mx-2" : "mx-0",
                "w-8",
                "z-10 hover:z-50"
              )}
              onMouseEnter={() => handleCardHover(card, manaKey)}
              onMouseLeave={() => handleCardHover(null)}
              onContextMenu={(e) => handleContextMenu(e, card, manaKey)}
            >
              <div className="w-8 h-11 relative flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 rounded-[4px] border border-emerald-400 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.8),inset_0_0_10px_rgba(16,185,129,0.6)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[60]" />
                <Card
                  card={card}
                  zone={manaKey}
                  onClick={(card, e) => {
                    e.stopPropagation();
                    const selectedCardIds = useGameStore.getState().selectedCardIds;
                    const toggleTappedBatch = useGameStore.getState().toggleTappedBatch;

                    if (selectedCardIds.includes(card.id)) {
                      toggleTappedBatch(selectedCardIds);
                    } else {
                      toggleTapped(card.id);
                    }
                  }}
                  onDoubleClick={handleCardDoubleClick}
                  onContextMenu={handleContextMenu}
                />
                {isTapped && (
                  <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none rounded-sm z-[100]">
                    <div className="text-[5px] font-black bg-red-600 text-white px-1 rounded uppercase scale-75">Tapped</div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Mana Counter Orb (Integrated at the side) */}
      {manaIds.length > 0 && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 z-50",
          flipped ? "-right-12" : "-left-12"
        )}>
          <div className="relative w-8 h-8 flex items-center justify-center drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
            <div
              className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-800 border border-emerald-400/50 shadow-lg"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)", transform: "rotate(90deg)" }}
            />
            <span className="relative z-10 text-[10px] font-black text-white italic">
              {manaUntapped}
            </span>
          </div>
          <div className="text-[6px] font-bold text-emerald-300 uppercase tracking-tighter opacity-80 mt-1">
            /{manaIds.length}
          </div>
        </div>
      )}

      {manaIds.length === 0 && (
        <div className="text-[14px] font-black text-white/5 uppercase tracking-[1em] select-none">
          NO MANA
        </div>
      )}
    </div>
  );
}
