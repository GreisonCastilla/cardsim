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
}

export function DroppableZone({ id, title, children, className, horizontalScroll, compact, invisible, onView }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col transition-colors",
        compact ? "rounded-none w-12 h-16 md:w-14 md:h-20" : (invisible ? "" : "rounded-xl border-2"), // Exact Card Size
        isOver && !compact && !invisible ? "border-white/50 bg-white/10 ring-2 ring-white/20" : "",
        isOver && compact ? "ring-2 ring-white/50 z-10" : ((!isOver && !invisible) ? "border-transparent" : ""),
        className
      )}
    >
      {!compact && !invisible && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
      )}
      
      {!compact && !invisible && (
        <div className="bg-black/30 text-white/50 text-[9px] font-bold uppercase tracking-tighter py-0.5 px-2 z-10 sticky top-0 backdrop-blur-sm border-b border-white/5 flex justify-between items-center">
          <span className="truncate">{title}</span>
          {onView && (
            <button 
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="p-0.5 hover:bg-white/10 rounded cursor-pointer pointer-events-auto transition-colors"
              title="Ver todas las cartas"
            >
              <Eye size={10} />
            </button>
          )}
        </div>
      )}

      {compact && onView && (
         <button 
           onClick={(e) => { e.stopPropagation(); onView(); }}
           className="absolute top-0.5 right-0.5 z-50 p-0.5 bg-black/40 hover:bg-black/60 text-white rounded cursor-pointer pointer-events-auto transition-colors focus:ring-1 focus:ring-white/30"
           title="Ver todas las cartas"
         >
           <Eye size={10} />
         </button>
      )}

      {compact && (
        <div className="absolute bottom-0 left-0 right-0 z-[40] bg-black/60 backdrop-blur-[1px] text-white text-[7px] font-bold uppercase py-0.5 text-center pointer-events-none rounded-b border-t border-white/5 select-none">
          {title}
        </div>
      )}
      
      <div className={cn(
        "z-10 min-h-[3rem]",
        compact ? "w-full h-full relative" : "flex-1 p-1 gap-1",
        horizontalScroll && !compact ? "flex overflow-x-auto items-center" : "",
        !horizontalScroll && !compact ? "flex flex-wrap content-start" : ""
      )}>
        {children}
      </div>
    </div>
  );
}
