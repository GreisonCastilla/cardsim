"use client";

import React, { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface ExtraZoneWidgetProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
}

export function ExtraZoneWidget({
  pid,
  zones,
  cards,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
}: ExtraZoneWidgetProps) {
  const extraKey = `${pid}_extraZone` as ZoneName;
  const cardIds = zones[extraKey] || [];
  const triggerRef = useRef<HTMLDivElement>(null);

  // ─── DnD Droppable ───
  const { setNodeRef, isOver } = useDroppable({
    id: extraKey,
    data: { type: "zone", zone: extraKey }
  });

  const totalCards = cardIds.length;
  const topCardId = totalCards > 0 ? cardIds[totalCards - 1] : null;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ─── Extra Slot Widget Base (Droppable) ─── */}
      <motion.div
        ref={(node) => {
          triggerRef.current = node;
          setNodeRef(node);
        }}
        whileHover={{ scale: 1.05, filter: "brightness(1.1) drop-shadow(0 0 15px rgba(6,182,212,0.5))" }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-[4.8rem] h-[6.7rem] p-[0.2rem] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group z-[1010] rounded-sm",
          "bg-black/40 border-2 border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm",
          isOver && "border-cyan-500/50 bg-cyan-500/20 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
        )}
      >
        {topCardId ? (
          <div className="w-full h-full relative">
            <Card
              card={cards[topCardId]}
              zone={extraKey}
              onHover={(c) => handleCardHover(c, extraKey)}
              onLeave={() => handleCardHover(null)}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
              onContextMenu={(e) => handleContextMenu(e, cards[topCardId], extraKey)}
              aspectRatio="aspect-[3/4]"
            />
            {totalCards > 1 && (
              <div className="absolute top-1 right-1 bg-cyan-600 text-white text-[7px] font-black px-1.5 rounded-sm shadow-lg border border-cyan-400 z-10">
                {totalCards}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-cyan-500/20 rounded bg-cyan-950/5 group-hover:border-cyan-400/40 transition-all duration-300 gap-1.5">
            <Sparkles size={24} className="text-cyan-400/30 group-hover:text-cyan-400/60 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-cyan-400/30 group-hover:text-cyan-400/60 uppercase text-center px-1">
              SPELL CAST
            </span>
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && (
          <div className="absolute inset-0 bg-cyan-500/20 mix-blend-screen rounded-sm" />
        )}
      </motion.div>
    </div>
  );
}
