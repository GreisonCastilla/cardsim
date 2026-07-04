"use client";

import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "./Card";
import { GameCard, ZoneName, useGameStore } from "../store/gameStore";

interface ShieldWidgetProps {
  card: GameCard;
  index: number;
  total: number;
  shieldKey: ZoneName;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
}

export function ShieldWidget({
  card,
  index,
  total,
  shieldKey,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
}: ShieldWidgetProps) {
  const center = (total - 1) / 2;
  const offset = index - center;

  const { floatingShields, setInspectedStackCardId } = useGameStore();
  const isFloating = floatingShields.includes(card.id);

  // Simple Flat Row Logic
  const rotY = 0;
  const rotX = 0;
  const transZ = 0;
  const transY = 0;
  const scale = 1;

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone: shieldKey },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: card.id,
    data: { card, isCard: true, zone: shieldKey },
    disabled: isDragging,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const draggableStyle = transform && !isDragging ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, z: -200 }}
      animate={{
        opacity: (isFloating || isDragging) ? 0 : 1,
        y: transY,
        z: transZ,
        rotateX: rotX,
        rotateY: rotY,
        scale: scale,
      }}
      exit={{ 
        opacity: 0, 
        scale: 1.8, 
        y: -40,
        rotateZ: 20,
        filter: "brightness(3) blur(4px)",
        transition: { duration: 0.5, ease: "easeIn" }
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 120,
        delay: index * 0.02
      }}
      ref={setNodeRef}
      className={cn("relative group z-20 transition-opacity duration-300 pointer-events-auto", isFloating && "pointer-events-none", isDragging && "opacity-0")}
      style={{ transformStyle: "preserve-3d", ...draggableStyle }}
    >
      {/* Target Highlight if hovering over */}
      {isOver && !isDragging && (
        <div className="absolute -inset-2 z-[-1] rounded-lg bg-yellow-400/30 blur-md border-2 border-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse pointer-events-none" />
      )}
      {/* Break Fragments (Exit only) */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-[100]"
        initial={{ opacity: 0 }}
        exit={{ opacity: 1 }}
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={{ 
              x: (Math.random() - 0.5) * 80, 
              y: (Math.random() - 0.5) * 80, 
              rotate: Math.random() * 360,
              scale: 0,
              opacity: 0
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-400/60 shadow-[0_0_8px_#3b82f6]"
            style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          />
        ))}
      </motion.div>
      <div className="relative w-8 h-11 flex items-center justify-center transition-all duration-300">
        {/* Luminous Glow Border on Hover */}
        <div className="absolute inset-0 rounded-[4px] border border-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.8),inset_0_0_10px_rgba(59,130,246,0.6)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" style={{ transform: "translateZ(7px)" }} />
        
        {/* The Shield Icon (Primary Visual) or Face-Up Card */}
        {card.face === 'up' ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)]" style={{ transform: "translateZ(6px)" }}>
            <div className="w-[104px] h-[146px] relative" style={{ transform: "scale(0.31)", transformOrigin: "center center" }}>
              <Card card={{...card, position: 'vertical'}} isStatic />
            </div>
          </div>
        ) : (
          <img
            src="/shield_frame.png"
            alt="Shield Icon"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.9)] group-hover:brightness-125"
            style={{ transform: "translateZ(6px)" }}
          />
        )}

        {/* Subtle Card Hint on Hover (Only if Face Down) */}
        {card.face !== 'up' && (
          <div className="absolute inset-0 flex items-center justify-center p-1 opacity-0 group-hover:opacity-20 transition-opacity overflow-hidden pointer-events-none">
            <div className="scale-[0.35]">
              <Card card={card} isStatic />
            </div>
          </div>
        )}

        {/* Interaction Surface */}
        <div
          className="absolute inset-0 cursor-pointer z-30 ring-1 ring-white/10 hover:ring-transparent rounded-sm"
          onMouseEnter={() => handleCardHover(card, shieldKey)}
          onMouseLeave={() => handleCardHover(null)}
          onClick={(e) => handleCardClick(card, e)}
          onDoubleClick={(e) => handleCardDoubleClick(card, e)}
          onContextMenu={(e) => handleContextMenu(e, card, shieldKey)}
          {...attributes}
          {...listeners}
        />

        {/* Stack HUD */}
        {card.underlyingCards && card.underlyingCards.length > 0 && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-200 z-[2000] opacity-0 group-hover:opacity-100 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInspectedStackCardId(card.id);
              }}
              className="w-4 h-4 rounded-full bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40"
              title="Ver Stack de Escudo"
            >
              <Layers size={8} className="drop-shadow-md pointer-events-none" />
            </button>
          </div>
        )}

        {/* Shield Stack Badge */}
        {card.underlyingCards && card.underlyingCards.length > 0 && (
          <div 
            className="absolute -bottom-1 -right-1 z-[40] bg-blue-600 border border-blue-400 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.8)] pointer-events-none"
            style={{ transform: "translateZ(10px)" }}
          >
            {card.underlyingCards.length + 1}
          </div>
        )}

        {/* Shield Energy Effect (Optional Overlay) */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
      </div>
    </motion.div>
  );
}
