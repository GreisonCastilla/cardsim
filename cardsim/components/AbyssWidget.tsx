"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface AbyssWidgetProps {
  pid: PlayerId;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
}

export function AbyssWidget({
  pid,
  zones,
  cards,
  handleCardHover,
  handleContextMenu,
}: AbyssWidgetProps) {
  const abyssKey = `${pid}_banishZone` as ZoneName;
  const cardIds = zones[abyssKey] || [];
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, right: 0, triggerWidth: 0 });
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

  // ─── DnD Droppable ───
  const { setNodeRef, isOver } = useDroppable({
    id: abyssKey,
    data: { type: "zone", zone: abyssKey }
  });

  // Update position when opening OR when card count changes
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverCoords({
        top: rect.top,
        left: rect.left,
        right: window.innerWidth - rect.right,
        triggerWidth: rect.width
      });
    }
  }, [isOpen, cardIds.length]);

  const totalCards = cardIds.length;
  const topCardId = totalCards > 0 ? cardIds[totalCards - 1] : null;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* ─── Widget Base (Trigger & Droppable) ─── */}
      <motion.div
        ref={(node) => {
          triggerRef.current = node;
          setNodeRef(node);
        }}
        whileHover={{ scale: 1.05, filter: "brightness(1.1) drop-shadow(0 0 15px rgba(20,184,166,0.5))" }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative w-[2.3rem] h-[3.1rem] p-[0.15rem] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group z-[1010] rounded-sm",
          "bg-black/40 border-2 border-white/10 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm",
          (isOpen || isOver) && "drop-shadow-[0_0_15px_rgba(20,184,166,0.6)] border-teal-500/50",
          isOver && "bg-teal-500/20 ring-2 ring-teal-500 ring-offset-2 ring-offset-transparent"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {topCardId ? (
          <div className="w-full h-full relative">
            <Card
              card={cards[topCardId]}
              zone={abyssKey}
              isStatic
              aspectRatio="aspect-[3/4]"
            />
            {totalCards > 1 && (
              <div className="absolute top-1 right-1 bg-teal-600 text-white text-[7px] font-black px-1 rounded-sm shadow-lg border border-teal-400 z-10">
                {totalCards}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 opacity-50 group-hover:opacity-80 transition-opacity">
            <img
              src="/ABBYS.png"
              alt="Empty Abyss"
              className="w-full h-full object-contain grayscale"
            />
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && (
          <div className="absolute inset-0 bg-teal-500/20 mix-blend-screen" />
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
                className={cn(
                  "absolute pointer-events-auto flex flex-col transition-all duration-300",
                  pid === "p1" ? "items-end" : "items-start"
                )}
                style={pid === "p1" ? { 
                  bottom: `calc(100vh - ${popoverCoords.top - 16}px)`,
                  right: popoverCoords.right,
                } : {
                  bottom: `calc(100vh - ${popoverCoords.top - 16}px)`,
                  left: popoverCoords.left,
                }}
              >
                {/* Popover Container */}
                <motion.div
                  layout
                  className={cn(
                    "p-1.5 bg-[#0a0a0a] border-2 transition-all duration-300 rounded-lg",
                    isOver ? "border-teal-500 shadow-[0_0_50px_rgba(20,184,166,0.5)] scale-105" : "border-teal-900 shadow-[0_0_40px_rgba(20,184,166,0.3)]",
                    "flex gap-3 min-w-max max-w-[90vw] items-center justify-end custom-scrollbar-thin overflow-x-auto h-[90px]"
                  )}
                >
                  <LayoutGroup>
                    {cardIds.length === 0 ? (
                      <div className="px-10 py-4 text-white/20 font-black uppercase tracking-widest text-[10px]">Empty</div>
                    ) : (
                      cardIds.map((id) => {
                        const card = cards[id];
                        if (!card) return null;

                        return (
                          <motion.div
                            layout
                            key={id}
                            className={cn(
                              "shrink-0 relative transition-all duration-300 cursor-pointer flex items-center justify-center w-[48px]"
                            )}
                            onContextMenu={(e) => handleContextMenu(e, card, abyssKey)}
                          >
                            <div className="w-[48px] h-[64px] relative flex items-center justify-center">
                              <Card
                                card={card}
                                zone={abyssKey}
                                isStatic
                                onHover={(c) => handleCardHover(c, abyssKey)}
                                onLeave={() => handleCardHover(null)}
                              />
                            </div>
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
                    isOver ? "border-t-teal-500" : "border-t-teal-900"
                  )}
                  style={pid === "p1" ? { marginRight: `${popoverCoords.triggerWidth / 2 - 10}px` } : { marginLeft: `${popoverCoords.triggerWidth / 2 - 10}px` }}
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
