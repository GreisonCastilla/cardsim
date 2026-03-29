import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../lib/utils';
import { ZoneName } from '../store/gameStore';
import { Eye } from 'lucide-react';

interface DroppableZoneProps {
  id: ZoneName;
  title: string;
  children: React.ReactNode;
  className?: string;
  horizontalScroll?: boolean;
  compact?: boolean;
  invisible?: boolean;
  onView?: () => void;
  count?: number;
  label?: string;
  manaCards?: string[]; // IDs of cards in mana
  cardsData?: Record<string, any>;
  style?: React.CSSProperties;
}

export function DroppableZone({ id, title, children, className, horizontalScroll, compact, invisible, onView, count, label, manaCards, cardsData, style }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });



  const glowClass = isOver
    ? id.includes('manaZone')
      ? "bg-emerald-500/10 ring-2 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      : id.includes('shields')
        ? "bg-amber-500/10 ring-2 ring-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        : "bg-blue-500/10 ring-2 ring-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col transition-all duration-500 rounded-sm border",
        compact
          ? "w-[60px] h-[84px] bg-[#ffffff08] border-white/20 backdrop-blur-[16px] shadow-[inset_0_0_15px_rgba(255,255,255,0.03),0_0_10px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-transparent",
        glowClass,
        className
      )}
    >
      {/* premium circular badge (Top Right) */}
      {typeof count === 'number' && (
        <div className={cn(
          "absolute z-30 flex items-center gap-1 transition-all duration-300",
          compact ? "top-0.5 right-0.5" : "top-2 right-2"
        )}>
          <div className={cn(
            "flex items-center justify-center font-black tabular-nums rounded bg-[#0a0d14]/80 backdrop-blur-md text-white/90 shadow-lg border border-white/10",
            compact ? "min-w-[14px] px-1 h-3.5 text-[8px]" : "w-6 h-6 text-[10px]",
            id.includes('manaZone') ? "border-emerald-500/30 text-emerald-400" : "",
            id.includes('shields') ? "border-amber-500/30 text-amber-400" : ""
          )}>
            {count}
          </div>
        </div>
      )}

      {/* Label (Top Left) */}
      {(label || (compact && label)) && (
        <div className="absolute top-1 left-1.5 z-30 text-white font-black tracking-[1px] text-[8px] uppercase select-none pointer-events-none drop-shadow-[0_0_2px_rgba(255,255,255,0.8)] opacity-90">
          {label}
        </div>
      )}


      {onView && (
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className={cn(
            "absolute z-30 p-1 hover:bg-white/10 text-white/20 hover:text-white/60 rounded transition-colors",
            compact ? "top-4 right-0.5" : "bottom-1 right-1"
          )}
          title="Ver todas"
        >
          <Eye size={compact ? 9 : 10} />
        </button>
      )}

      <div className={cn(
        "z-10 min-h-[3rem] w-full",
        compact ? "h-full relative overflow-visible" : cn(
          "flex-1 relative min-h-0",
          invisible ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        ),
        horizontalScroll && !compact ? "flex overflow-x-auto overflow-y-hidden items-center p-2 gap-2 custom-scrollbar" : "",
        !horizontalScroll && !compact ? "flex flex-wrap content-start p-2 gap-2 custom-scrollbar" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
