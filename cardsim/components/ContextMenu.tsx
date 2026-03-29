"use client";

import React from "react";
import { GameCard, ZoneName } from "../store/gameStore";

interface ContextMenuState {
  card: GameCard;
  zone: ZoneName;
  x: number;
  y: number;
}

interface ContextMenuProps {
  contextMenu: ContextMenuState | null;
  toggleTapped: (id: string) => void;
  toggleFace: (id: string) => void;
  setViewingZone: (state: any) => void;
  setContextMenu: (state: ContextMenuState | null) => void;
}

export function ContextMenu({
  contextMenu,
  toggleTapped,
  toggleFace,
  setViewingZone,
  setContextMenu,
}: ContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-[1100] bg-[#090c12]/98 backdrop-blur-xl border border-white/10 p-0 shadow-4xl min-w-[150px]"
      style={{ left: Math.min(contextMenu.x, window.innerWidth - 160), top: Math.min(contextMenu.y, window.innerHeight - 150) }}
    >
      <div className="text-[8px] text-white/20 uppercase font-black px-5 py-3 border-b border-white/5 tracking-widest">Options</div>
      {contextMenu.zone.includes("manaZone") && (
        <button
          onClick={() => { toggleTapped(contextMenu.card.id); setContextMenu(null); }}
          className="w-full px-5 py-4 hover:bg-emerald-600/10 text-white text-[10px] font-black text-left uppercase tracking-widest"
        >
          Tap / Untap
        </button>
      )}
      {contextMenu.zone.includes("shields") && (
        <div className="flex flex-col">
          <button
            onClick={() => { setViewingZone({ zone: contextMenu.zone, mode: "private" }); setContextMenu(null); }}
            className="px-5 py-4 hover:bg-amber-600/10 text-white text-[10px] font-black text-left uppercase tracking-widest"
          >
            Break (View)
          </button>
          <button
            onClick={() => { toggleFace(contextMenu.card.id); setContextMenu(null); }}
            className="px-5 py-4 hover:bg-white/5 text-white text-[10px] font-black text-left uppercase tracking-widest border-t border-white/5"
          >
            Reveal / Hide
          </button>
        </div>
      )}
    </div>
  );
}
