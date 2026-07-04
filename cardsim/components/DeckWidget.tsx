"use client";

import React, { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface DeckWidgetProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleDeckClick: (pid: PlayerId) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
}

export function DeckWidget({
  pid,
  zones,
  cards,
  handleDeckClick,
  handleContextMenu,
}: DeckWidgetProps) {
  const deckKey = `${pid}_mainDeck` as ZoneName;
  const cardIds = zones[deckKey] || [];
  const triggerRef = useRef<HTMLDivElement>(null);

  // ─── DnD Droppable ───
  const { setNodeRef, isOver } = useDroppable({
    id: deckKey,
    data: { type: "zone", zone: deckKey }
  });

  const totalCards = cardIds.length;
  const topCardId = cardIds.length > 0 ? cardIds[cardIds.length - 1] : null;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ─── Deck Stack Visual ─── */}
      <motion.div
        ref={(node) => {
          triggerRef.current = node;
          setNodeRef(node);
        }}
        whileHover={{ scale: 1.05, filter: "brightness(1.1) drop-shadow(0 0 15px rgba(59,130,246,0.6))" }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-[2.3rem] h-[3.1rem] p-[0.15rem] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group z-[1010] rounded-sm",
          "bg-black/40 border-2 border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm",
          isOver && "border-blue-500/50 bg-blue-500/20 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
        )}

        onClick={(e) => {
          e.stopPropagation();
          handleDeckClick(pid);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const dummyCard = topCardId ? cards[topCardId] : { id: 'empty', owner: pid } as GameCard;
          handleContextMenu(e, dummyCard, deckKey);
        }}
      >
        {/* Layered Deck Effect */}
        {totalCards > 1 && (
          <div className="absolute inset-[0.15rem] translate-x-[2px] translate-y-[2px] bg-slate-900 rounded-sm border border-white/20 z-[-1]" />
        )}
        {totalCards > 5 && (
          <div className="absolute inset-[0.15rem] translate-x-[4px] translate-y-[4px] bg-slate-900 rounded-sm border border-white/10 z-[-2]" />
        )}

        {/* Top Card Back */}
        <div className={cn(
          "w-full h-full relative rounded-sm overflow-hidden ring-1 ring-white/20 shadow-xl",
          isOver && "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent"
        )}>
          <img
            src="/deck_new.png"
            alt="Main Deck"
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              isOver && "brightness-125 scale-105"
            )}
            draggable={false}
          />
          {/* Drop Indicator */}
          {isOver && (
            <div className="absolute inset-0 bg-blue-500/30 mix-blend-screen" />
          )}
        </div>
      </motion.div>
    </div>
  );
}
