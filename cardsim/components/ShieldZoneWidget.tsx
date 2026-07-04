"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

import { ShieldWidget } from "./ShieldWidget";

interface ShieldZoneWidgetProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  flipped?: boolean;
}

export function ShieldZoneWidget({
  pid,
  zones,
  cards,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
  flipped = false,
}: ShieldZoneWidgetProps) {
  const shieldKey = `${pid}_shields` as ZoneName;
  const shieldIds = zones[shieldKey] || [];
  const [showBreakFlash, setShowBreakFlash] = React.useState(false);
  const prevShieldCount = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prevShieldCount.current !== null && shieldIds.length < prevShieldCount.current) {
      setShowBreakFlash(true);
      const timer = setTimeout(() => setShowBreakFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevShieldCount.current = shieldIds.length;
  }, [shieldIds.length]);

  const { setNodeRef, isOver } = useDroppable({
    id: shieldKey,
    data: { isCard: false, type: "zone", zone: shieldKey }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "player-target relative flex items-center justify-center gap-2 p-4 transition-all duration-300 w-full h-full bg-slate-900/10 border-y border-white/[0.03] backdrop-blur-sm",
        isOver && "bg-blue-500/10 ring-2 ring-inset ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
        flipped && "rotate-180"
      )}
      data-card-id={`${pid}_player`}
    >
      {/* Red Flash Overlay (Shield Break) */}
      <AnimatePresence>
        {showBreakFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 pointer-events-none"
          >
            <div className="absolute inset-0 border-y-2 border-red-500/50 bg-red-600/5 shadow-[inset_0_0_30px_rgba(239,68,68,0.2)] blur-[2px]" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {shieldIds.map((id, index) => {
          const card = cards[id];
          if (!card) return null;

          return (
            <ShieldWidget
              key={id}
              card={card}
              index={index}
              total={shieldIds.length}
              shieldKey={shieldKey}
              handleCardHover={handleCardHover}
              handleCardClick={handleCardClick}
              handleCardDoubleClick={handleCardDoubleClick}
              handleContextMenu={handleContextMenu}
            />
          );
        })}
      </AnimatePresence>

      {/* Hexagonal Counter */}
      {shieldIds.length > 0 && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 z-50",
          flipped ? "-right-12" : "-left-12"
        )}>
          <div className="relative w-8 h-8 flex items-center justify-center drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]">
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-500/80 to-blue-800/80 border border-blue-400/30 shadow-lg"
              style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)", transform: "rotate(90deg)" }}
            />
            <span className="relative z-10 text-[10px] font-black text-white/90 italic">
              {shieldIds.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
