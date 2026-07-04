"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId, useGameStore } from "../store/gameStore";

interface ManaZoneWidgetProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  setViewingZone: (state: any) => void;
}

type Civilization = "Fire" | "Water" | "Nature" | "Light" | "Darkness";

interface CivStat {
  civ: Civilization;
  total: number;
  untapped: number;
  tapped: number;
}

const CIV_ORDER: Civilization[] = ["Nature", "Light", "Water", "Darkness", "Fire"];

const CIV_POSITIONS: Record<Civilization, { top: string; left: string }> = {
  Nature:   { top: "22%", left: "22%" },
  Light:    { top: "22%", left: "78%" },
  Water:    { top: "52%", left: "85%" },
  Darkness: { top: "82%", left: "50%" },
  Fire:     { top: "52%", left: "15%" },
};

const CIV_ALIASES: Record<string, Civilization> = {
  Fire: "Fire", "火": "Fire",
  Water: "Water", "水": "Water",
  Nature: "Nature", "自然": "Nature",
  Light: "Light", "光": "Light",
  Darkness: "Darkness", "闇": "Darkness", Dark: "Darkness",
};

function resolveCiv(raw: string): Civilization | null {
  return CIV_ALIASES[raw.trim()] || null;
}

export function ManaZoneWidget({
  pid,
  zones,
  cards,
  handleCardHover,
  handleContextMenu,
}: ManaZoneWidgetProps) {
  const manaKey = `${pid}_manaZone` as ZoneName;
  const manaIds = zones[manaKey] || [];
  const { toggleTapped } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, triggerWidth: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ─── Click Outside Listener ───
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideTrigger = triggerRef.current?.contains(target);
      const isClickInsidePopover = popoverRef.current?.contains(target);

      if (!isClickInsideTrigger && !isClickInsidePopover) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // ─── Drop logic removed, moved to ManaZoneStrip ───
  const isOver = false;

  // Update position when opening OR when mana count changes
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverCoords({
        top: rect.top,
        left: rect.left,
        triggerWidth: rect.width
      });
    }
  }, [isOpen, manaIds.length]);

  const civStats = useMemo(() => {
    const map = new Map<Civilization, CivStat>();
    manaIds.forEach((id) => {
      const card = cards[id];
      if (!card) return;
      const civStr = card.civilization || card.color || "";
      const civParts = civStr.split("/");
      civParts.forEach((raw) => {
        const civ = resolveCiv(raw);
        if (!civ) return;
        if (!map.has(civ)) {
          map.set(civ, { civ, total: 0, untapped: 0, tapped: 0 });
        }
        const stat = map.get(civ)!;
        stat.total++;
        if (card.position === "horizontal") stat.tapped++;
        else stat.untapped++;
      });
    });
    return map;
  }, [manaIds, cards]);

  const totalMana = manaIds.length;
  const totalUntapped = manaIds.filter((id) => cards[id]?.position !== "horizontal").length;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ─── Widget Base ─── */}
      <motion.div 
        ref={(node) => {
          triggerRef.current = node;
        }}
        whileHover={{ scale: 1.1, filter: "brightness(1.2) drop-shadow(0 0 12px rgba(59,130,246,0.6))" }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-10 h-10 flex items-center justify-center transition-all duration-300 cursor-pointer group z-[1010] rounded-full",
          (isOpen || isOver) && "scale-110 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]",
          isOver && "ring-2 ring-emerald-500 ring-offset-4 ring-offset-black/50 rounded-full"
        )}

        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {/* Background Image */}
        <img 
          src="/CIVILIZATIONS.png" 
          alt="Civilizations" 
          className={cn(
            "w-full h-full object-contain transition-all duration-300",
            isOver && "brightness-125 scale-105"
          )}
        />

        {/* Central Total Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
            {/* {totalUntapped} */}
          </span>
          <span className="text-[6px] font-bold text-white/50 uppercase tracking-widest mt-0.5">
            {/* Mana */}
          </span>
        </div>

        {/* Civilization Counters Overlay */}
        {CIV_ORDER.map((civ) => {
          const stat = civStats.get(civ);
          const pos = CIV_POSITIONS[civ];
          if (!stat || stat.total === 0) return null;

          return (
            <div 
              key={civ}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className={cn(
                "flex items-center justify-center w-4 h-4 rounded-full",
                "bg-black/60 backdrop-blur-md border border-white/20 shadow-lg",
                stat.untapped > 0 ? "ring-1 ring-white/50" : "opacity-40"
              )}>
                <span className="text-[7px] font-black text-white">
                  {/* {stat.untapped} */}
                </span>
              </div>
            </div>
          );
        })}

        {/* Drop Indicator */}
        {isOver && (
          <div className="absolute -inset-2 border-2 border-emerald-500 rounded-full animate-ping opacity-20" />
        )}
      </motion.div>

      {/* ─── Popover Portal ─── */}
      {isClient && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              className="fixed inset-0 z-[2000] pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute pointer-events-auto flex flex-col items-start transition-all duration-300"
                style={{ 
                  bottom: `calc(100vh - ${popoverCoords.top - 16}px)`,
                  left: popoverCoords.left,
                }}
              >
                {/* Popover Container */}
                <motion.div 
                  layout
                  className={cn(
                    "p-1.5 bg-[#0a0a0a] border-2 transition-all duration-300 rounded-lg",
                    isOver ? "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105" : "border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.4)]",
                    "flex gap-3 min-w-max max-w-[90vw] items-center custom-scrollbar-thin overflow-x-auto h-[90px]"
                  )}
                >
                  <LayoutGroup>
                    {manaIds.length === 0 ? (
                      <div className="px-10 py-4 text-white/20 font-black uppercase tracking-widest text-[10px]">Empty</div>
                    ) : (
                      manaIds.map((id) => {
                        const card = cards[id];
                        if (!card) return null;
                        const isTapped = card.position === "horizontal";
                        
                        return (
                          <motion.div
                            layout
                            key={id}
                            className={cn(
                              "shrink-0 relative transition-all duration-300 cursor-pointer flex items-center justify-center",
                              isTapped ? "w-[64px]" : "w-[48px]",
                              isTapped && "opacity-50"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTapped(id);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, card, manaKey)}
                          >
                            <div className="w-[48px] h-[64px] relative flex items-center justify-center">
                              <Card
                                card={card}
                                zone={manaKey}
                                isStatic
                                onHover={(c) => handleCardHover(c, manaKey)}
                                onLeave={() => handleCardHover(null)}
                              />
                            </div>
                            {isTapped && (
                              <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none rounded-sm z-[100]">
                                 <div className="text-[6px] font-black bg-red-600 text-white px-1 rounded uppercase scale-75">Tapped</div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </LayoutGroup>
                </motion.div>

                {/* Triangle Tail */}
                <motion.div 
                  layout
                  className={cn(
                    "w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] mt-[-2px] transition-colors duration-300",
                    isOver ? "border-t-emerald-500" : "border-t-blue-500"
                  )}
                  style={{ marginLeft: `${56 / 2 - 10}px` }}

                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
