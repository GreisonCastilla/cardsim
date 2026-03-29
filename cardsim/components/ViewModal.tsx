"use client";

import React from "react";
import { X } from 'lucide-react';
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface ViewModalState {
  zone: ZoneName;
  mode: "full" | "private" | "reveal";
  amount?: number;
}

interface ViewModalProps {
  viewingZone: ViewModalState | null;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  currentPlayer: PlayerId;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  setViewingZone: (state: ViewModalState | null) => void;
}

export function ViewModal({
  viewingZone,
  zones,
  cards,
  currentPlayer,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  setViewingZone,
}: ViewModalProps) {
  if (!viewingZone) return null;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[1200] flex items-end justify-center pointer-events-none">
      <div className="relative flex flex-col items-center min-w-[300px] min-h-[160px] max-w-[90vw] bg-[#090c12]/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto">
        <div className="flex gap-4 mb-3 w-full justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50">{viewingZone.mode === 'reveal' ? 'REVEALED' : viewingZone.zone.replace('_', ' ')}</span>
          <button onClick={() => setViewingZone(null)} className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 hover:bg-red-500/30 hover:text-red-300 px-3 py-1 rounded transition-colors"><X size={12} /></button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto p-1 items-start justify-center w-full custom-scrollbar-thin max-w-full">
          {zones[viewingZone.zone].length === 0 ? (
            <div className="opacity-10 font-black text-2xl uppercase tracking-[0.5em] py-4 px-10">Empty</div>
          ) : (
            zones[viewingZone.zone].slice(0, viewingZone.amount).map(id => (
              <div key={id} className="hover:scale-105 hover:-translate-y-2 transition-all duration-300 shrink-0 w-14 md:w-16 drop-shadow-xl cursor-pointer">
                <Card
                  card={{
                    ...cards[id],
                    face: (viewingZone.mode === 'private' && !viewingZone.zone.startsWith(currentPlayer) ? 'down' : 'up'),
                    position: 'vertical'
                  }}
                  zone={viewingZone.zone}
                  onHover={(c) => handleCardHover(c, viewingZone.zone)}
                  onLeave={() => handleCardHover(null)}
                  onClick={handleCardClick}
                  onDoubleClick={handleCardDoubleClick}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
