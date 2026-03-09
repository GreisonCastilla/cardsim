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
  onHover?: (card: GameCard | null) => void;
  onClick?: (card: GameCard, event: React.MouseEvent) => void;
}

export function Card({ card, zone, isOverlay, isStatic, onHover, onClick }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, fromZone: zone },
    disabled: isStatic || isOverlay,
  });

  const style = transform && !isDragging ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleMouseEnter = () => {
    if (onHover && !isDragging) onHover(card);
  };

  const handleMouseLeave = () => {
    if (onHover && !isDragging) onHover(null);
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
      onMouseLeave={handleMouseLeave}
      onClick={(e) => onClick && onClick(card, e)}
      className={cn(
        "relative transition-all duration-200 border border-white/10",
        !isStatic && "cursor-grab active:cursor-grabbing",
        "w-full h-full aspect-[3/4] shrink-0", 
        isDragging && "opacity-50 z-50",
        isOverlay && "opacity-100 z-50 scale-105 pointer-events-none ring-1 ring-white/30",
        isFacedown ? "bg-slate-900" : "bg-white",
        isTapped && "rotate-90 origin-center" 
      )}
    >
      {!isFacedown ? (
        <div className="flex flex-col h-full w-full p-0.5 text-slate-900 justify-between select-none relative overflow-hidden bg-white">
          {/* Mana Cost - minimalist */}
          <div className="absolute top-0.5 right-0.5 z-20 flex items-center justify-center bg-blue-500 text-white w-3 h-3 md:w-4 md:h-4">
            <span className="text-[7px] md:text-[9px] font-black leading-none">{card.manaCost}</span>
          </div>
          
          <div className="relative z-10 flex-1 my-0.5 bg-slate-100 flex items-center justify-center overflow-hidden">
            {card.image ? (
              <img src={card.image} alt={card.name} className="object-cover w-full h-full" draggable={false} />
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-20">
                <Shield size={12} className="text-slate-400" />
              </div>
            )}
          </div>
          <div className="bg-slate-900 text-white text-[5px] md:text-[6px] px-0.5 truncate leading-tight uppercase font-bold">
            {card.name}
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 border border-white/5">
           <div className="w-4 h-4 md:w-5 md:h-5 border border-white/10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-700"></div>
           </div>
        </div>
      )}
    </div>
  );
}
