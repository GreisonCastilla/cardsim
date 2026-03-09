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
  count?: React.ReactNode;
}

export function DroppableZone({ id, title, children, className, horizontalScroll, compact, invisible, onView, count }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col transition-all duration-200",
        compact ? "w-12 h-16 md:w-14 md:h-20" : "border-[rgba(255,255,255,0.05)] border",
        isOver ? "bg-white/5 border-[rgba(255,255,255,0.1)]" : "",
        className
      )}
    >
      {/* minimalist badge */}
      {count !== undefined && !compact && (
        <div className={cn(
          "absolute top-1 right-1 z-30 flex items-center justify-center font-[Inter,sans-serif] text-white/90 shadow-2xl text-[9px] font-black backdrop-blur-md pointer-events-none bg-black/40",
          id.includes('manaZone') ? "border border-green-400/50 shadow-[0_0_8px_rgba(74,222,128,0.4)] text-green-300 rounded-[5px] px-1 py-0.5 min-w-[18px]" :
            id.includes('shields') ? "border border-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.4)] text-yellow-300 rounded-full w-[18px] h-[18px]" :
              "border border-white/20 rounded-full w-[18px] h-[18px]"
        )}>
          {count}
        </div>
      )}

      {!compact && !invisible && title && (
        <div className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em] font-[Inter,sans-serif] px-2 py-1 flex justify-between items-center pointer-events-none select-none">
          <span>{title}</span>
        </div>
      )}

      {onView && !compact && (
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="absolute bottom-1 right-1 z-30 p-1 hover:bg-white/10 text-white/20 hover:text-white/60 rounded transition-colors"
          title="Ver todas"
        >
          <Eye size={10} />
        </button>
      )}

      <div className={cn(
        "z-10 min-h-[3rem] w-full",
        compact ? "h-full relative" : "flex-1 relative overflow-y-auto overflow-x-hidden min-h-0",
        horizontalScroll && !compact ? "flex overflow-x-auto overflow-y-hidden items-center p-2 gap-2 custom-scrollbar" : "",
        !horizontalScroll && !compact ? "flex flex-wrap content-start p-2 gap-2 custom-scrollbar" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
