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
  allowOverflow?: boolean;
}

export function DroppableZone({ id, title, children, className, horizontalScroll, compact, invisible, onView, count, label, manaCards, cardsData, style, allowOverflow }: DroppableZoneProps) {
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
      onClick={compact && onView ? () => onView() : undefined}
      className={cn(
        "relative flex flex-col transition-all duration-500 rounded-sm border",
        compact
          ? "w-[60px] h-[84px] bg-[#ffffff08] border-white/20 backdrop-blur-[16px] shadow-[inset_0_0_15px_rgba(255,255,255,0.03),0_0_10px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-transparent",
        compact && onView ? "cursor-pointer" : "",
        glowClass,
        className
      )}
    >
      {/* Label (Top Left) */}
      {(label || (compact && label)) && (
        <div className={cn(
          "absolute z-40 text-white font-black tracking-[1px] text-[8px] uppercase select-none pointer-events-none transition-all duration-300",
          compact && label !== 'ABBYS'
            ? "-top-[15px] left-0 bg-[#0a0d14]/90 backdrop-blur-md border border-b-0 border-white/20 rounded-t-sm shadow-[0_-4px_10px_rgba(0,0,0,0.5)] px-1.5 h-[15px] flex items-center justify-center"
            : "top-1 left-1.5 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)] opacity-90"
        )}>
          {label}
        </div>
      )}

      {/* HUD (Top Right: Eye + Count) */}
      <div className={cn(
        "absolute z-40 flex items-center transition-all duration-300",
        id.includes('hand') 
          ? "top-[40%] -left-6 -translate-y-1/2 flex-col gap-1" 
          : compact
            ? "-top-[15px] right-0 bg-[#0a0d14]/90 backdrop-blur-md border border-b-0 border-white/20 rounded-t-sm shadow-[0_-4px_10px_rgba(0,0,0,0.5)] px-0.5 h-[15px]"
            : "top-2 right-2 gap-0.5"
      )}>
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className={cn(
              "hover:bg-white/10 text-white/50 hover:text-white/90 rounded transition-colors flex items-center justify-center",
              compact ? "p-0.5" : "p-0.5 mr-1"
            )}
            title="Ver todas"
          >
            <Eye size={compact ? 8 : 12} />
          </button>
        )}
        {typeof count === 'number' && (
          <div className={cn(
            "flex items-center justify-center font-black tabular-nums",
            compact ? "min-w-[12px] px-0.5 text-[8px] text-white/90" : "rounded bg-[#0a0d14]/80 backdrop-blur-md text-white/90 shadow-lg border border-white/10 w-6 h-6 text-[10px]",
            id.includes('manaZone') ? (compact ? "text-emerald-400" : "border-emerald-500/30 text-emerald-400") : "",
            id.includes('shields') ? (compact ? "text-amber-400" : "border-amber-500/30 text-amber-400") : ""
          )}>
            {count}
          </div>
        )}
      </div>

      <div className={cn(
        "z-10 min-h-[3rem] w-full",
        compact ? "h-full relative overflow-visible" : cn(
          "flex-1 relative min-h-0",
          (invisible || allowOverflow) ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        ),
        horizontalScroll && !compact ? "flex overflow-x-auto overflow-y-hidden items-center p-2 gap-2 custom-scrollbar" : "",
        !horizontalScroll && !compact ? "flex flex-wrap content-start p-2 gap-2 custom-scrollbar" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
