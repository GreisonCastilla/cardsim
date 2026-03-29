import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GameCard, ZoneName, useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import { Shield } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface CardProps {
  card: GameCard;
  zone?: ZoneName;
  isOverlay?: boolean;
  isStatic?: boolean;
  onHover?: (card: GameCard) => void;
  onLeave?: () => void;
  onClick?: (card: GameCard, event: React.MouseEvent) => void;
  onDoubleClick?: (card: GameCard, event: React.MouseEvent) => void;
  aspectRatio?: string;
}
export function Card({ card, zone, isOverlay, isStatic, onHover, onLeave, onClick, onDoubleClick, aspectRatio = "aspect-[3/4]" }: CardProps) {
  const { cards } = useGameStore();
  const { t } = useLanguage();
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const dragId = isStatic || isOverlay ? `${card.id}-preview` : card.id;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { card, fromZone: zone },
    disabled: isStatic || isOverlay,
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: card.id,
    data: { card, isCard: true },
    disabled: isStatic || isOverlay || isDragging,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

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
    <div className="relative w-full h-full">
      {/* EXLife Badge */}
      {card.linkedCardIds && card.linkedCardIds.length > 0 && (
        <div className="absolute -top-1 -left-1 z-[60] bg-orange-600 text-white text-[6px] md:text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-lg border border-orange-400 animate-pulse pointer-events-none uppercase">
          EXLife: {card.linkedCardIds.length}
        </div>
      )}

      {/* Linked cards (EXLife) (Rendered as a stack underneath) */}
      {card.linkedCardIds && card.linkedCardIds.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {card.linkedCardIds.map((id, index) => {
            const linkedCard = cards[id];
            if (!linkedCard) return null;
            return (
              <div
                key={id}
                className="absolute inset-0 bg-[#4e342e] rounded-sm border border-orange-500/30 shadow-lg"
                style={{
                  zIndex: -1 - index,
                  transform: `translate(${(index + 1) * 3}px, ${(index + 1) * 3}px)`,
                }}
              >
                {/* Back of the EXLife card - distinctive design */}
                <div className="w-full h-full flex items-center justify-center opacity-40">
                  <div className="w-full h-full border border-orange-500/20 m-0.5 rounded-[1px]" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Card */}
      <div
        ref={setNodeRef}
        style={style}
        {...(isStatic ? {} : listeners)}
        {...(isStatic ? {} : attributes)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => onLeave && onLeave()}
        onClick={(e) => onClick && onClick(card, e)}
        onDoubleClick={(e) => onDoubleClick && onDoubleClick(card, e)}
        className={cn(
          "relative transition-all duration-200 ease-out",
          !isStatic && "cursor-grab active:cursor-grabbing",
          "w-full h-full shrink-0 rounded-sm",
          aspectRatio,
          shadowClass,
          isDragging && "opacity-50 z-50",
          isOverlay && "opacity-100 z-[1000] scale-105 pointer-events-none ring-1 ring-white/30",
          isOver && "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(255,255,0,0.5)]",
          isFacedown ? "bg-slate-900" : "bg-slate-800",
          isTapped && "rotate-90 origin-center"
        )}
      >
        {!isFacedown ? (
          <div className="relative h-full w-full select-none rounded-sm group/img">
            <div className="w-full h-full flex items-center justify-center overflow-visible relative">
              {card.image ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-slate-700/50 animate-pulse rounded-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                  )}
                  <img 
                    src={card.image} 
                    alt={t(card.nameJa || card.name, card.nameEn || card.name)} 
                    className={cn(
                      "object-contain w-full h-full rounded-sm transition-opacity duration-300",
                      imageLoaded ? "opacity-100" : "opacity-0"
                    )} 
                    draggable={false}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <Shield size={16} className="text-slate-600 opacity-30" />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a237e] border-2 border-amber-400/30 rounded-sm shadow-inner overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:10px_10px]" />
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-amber-500/40 flex items-center justify-center rotate-45 bg-[#283593] shadow-xl">
              <div className="w-2 h-2 bg-amber-500/60 -rotate-45 shadow-[0_0_10px_rgba(255,191,0,0.5)]"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
