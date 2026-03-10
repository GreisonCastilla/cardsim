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
  onLeave?: () => void;
  onClick?: (card: GameCard, event: React.MouseEvent) => void;
  onDoubleClick?: (card: GameCard, event: React.MouseEvent) => void;
}

export function Card({ card, zone, isOverlay, isStatic, onHover, onLeave, onClick, onDoubleClick }: CardProps) {
  const dragId = isStatic || isOverlay ? `${card.id}-preview` : card.id;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { card, fromZone: zone },
    disabled: isStatic || isOverlay,
  });

  const style = transform && !isDragging ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleMouseEnter = () => {
    if (onHover && !isDragging) onHover(card);
  };

  const isFacedown = card.face === 'down';
  const isTapped = card.position === 'horizontal';

  const isMano = zone?.includes('hand');
  const shadowClass = isDragging 
    ? "shadow-[0_20px_40px_rgba(0,0,0,0.8)] scale-110" 
    : isMano 
      ? "shadow-[0_10px_20px_rgba(0,0,0,0.6)]" 
      : "shadow-[0_4px_8px_rgba(0,0,0,0.4)]";

  return (
    <div
      ref={isStatic ? undefined : setNodeRef}
      style={isStatic ? undefined : style}
      {...(isStatic ? {} : listeners)}
      {...(isStatic ? {} : attributes)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onLeave && onLeave()}
      onClick={(e) => onClick && onClick(card, e)}
      onDoubleClick={(e) => onDoubleClick && onDoubleClick(card, e)}
      className={cn(
        "relative transition-all duration-200 ease-out",
        !isStatic && "cursor-grab active:cursor-grabbing",
        "w-full h-full aspect-[3/4] shrink-0",
        shadowClass,
        isDragging && "opacity-50 z-50",
        isOverlay && "opacity-100 z-[1000] scale-105 pointer-events-none ring-1 ring-white/30",
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
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <div className="w-4 h-4 md:w-5 md:h-5 bg-white/5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-slate-700"></div>
          </div>
        </div>
      )}
    </div>
  );
}
