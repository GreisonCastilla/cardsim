import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GameCard, ZoneName } from '../store/gameStore';
import { cn } from '../lib/utils';
import { Shield, Swords, Droplet } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardProps {
  card: GameCard;
  zone?: ZoneName;
  isOverlay?: boolean;
  isStatic?: boolean; // Disables DnD entirely
  onHover?: (card: GameCard) => void;
  onClick?: (card: GameCard, event: React.MouseEvent) => void;
}

export function Card({ card, zone, isOverlay, isStatic, onHover, onClick }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone: zone },
    disabled: isStatic,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleMouseEnter = () => {
    if (onHover && !isDragging) onHover(card);
  };

  const isFacedown = card.face === 'down';
  const isTapped = card.position === 'horizontal';

  return (
    <div
      ref={isStatic ? undefined : setNodeRef}
      style={isStatic ? undefined : style}
      {...(isStatic ? {} : listeners)}
      {...(isStatic ? {} : attributes)}
      onMouseEnter={handleMouseEnter}
      onClick={(e) => onClick && onClick(card, e)}
      className={cn(
        "relative rounded-xl border-2 transition-all flex-shrink-0 shadow-lg",
        !isStatic && "cursor-grab active:cursor-grabbing",
        "w-12 h-16 md:w-14 md:h-20", // Compact sizes
        isDragging && "opacity-50 z-50",
        isOverlay && "opacity-100 z-50 scale-105 shadow-2xl",
        isFacedown ? "bg-slate-800 border-slate-600 pattern-isometric pattern-slate-700 pattern-bg-slate-800 pattern-size-2 pattern-opacity-100" : "bg-white border-slate-300",
        isTapped && "rotate-90 origin-center" // Rotate horizontal
      )}
    >
      {!isFacedown ? (
        <div className="flex flex-col h-full w-full p-1 text-slate-900 justify-between select-none relative overflow-hidden bg-slate-50">
          {/* Mana Cost Circle */}
          <div className="absolute top-1 right-1 z-20 flex items-center justify-center bg-blue-600 text-white rounded-full w-5 h-5 md:w-6 md:h-6 border border-blue-400 shadow-sm shadow-blue-900/20">
            <span className="text-[10px] md:text-sm font-black leading-none">{card.manaCost}</span>
          </div>
          
          {/* Future Image Area */}
          <div className="relative z-10 flex-1 my-0.5 bg-slate-200/50 rounded-lg border border-slate-300/30 flex items-center justify-center overflow-hidden">
            {card.image ? (
              <img src={card.image} alt={card.name} className="object-cover w-full h-full" draggable={false} />
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-20">
                <Shield size={16} className="text-slate-400" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full rounded-xl flex items-center justify-center border-2 border-slate-700 bg-[#1e293b] p-1 overflow-hidden">
          {/* Premium Card Back Face Design */}
          <div className="w-full h-full border border-slate-600/50 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
             {/* Abstract pattern */}
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
             <div className="absolute inset-0 pattern-grid-slate-700/20 pattern-size-4"></div>
             
             <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center shadow-inner shadow-black/50">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/20 blur-[1px]"></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
