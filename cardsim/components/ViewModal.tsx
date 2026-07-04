"use client";

import React from "react";
import { X } from 'lucide-react';
import { Card } from "./Card";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

interface ViewModalState {
  zone: ZoneName;
  mode: "full" | "private" | "reveal";
  amount?: number;
  cardIds?: string[]; // Fixed list of IDs to display
}

interface ViewModalProps {
  viewingZone: ViewModalState | null;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  currentPlayer: PlayerId;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  setViewingZone: (state: ViewModalState | null) => void;
  setPreviewCard: (card: GameCard | null) => void;
}

export function ViewModal({
  viewingZone,
  zones,
  cards,
  currentPlayer,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
  setViewingZone,
  setPreviewCard,
}: ViewModalProps) {
  if (!viewingZone) return null;

  return (
    <div 
      className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-[45%] z-[25000] flex items-center justify-center pointer-events-none w-full"
      style={{ perspective: "1100px" }}
    >
      <div 
        className="relative flex flex-col items-center min-w-[240px] min-h-[140px] max-w-[60vw] bg-[#090c12]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-4 shadow-[0_0_60px_rgba(0,0,0,0.9)] pointer-events-auto"
        style={{
          transform: "rotateX(18deg) scale(0.95)",
          transformStyle: "preserve-3d",
          transformOrigin: "center center"
        }}
      >
        <div className="flex gap-4 mb-1 w-full justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50">{viewingZone.mode === 'reveal' ? 'REVEALED' : viewingZone.zone.replace('_', ' ')}</span>
          <button onClick={() => setViewingZone(null)} className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 hover:bg-red-500/30 hover:text-red-300 px-3 py-1 rounded transition-colors"><X size={12} /></button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto overflow-y-visible p-2 pt-6 items-center justify-center w-full custom-scrollbar-thin max-w-full">
          {(() => {
            const rawIds = viewingZone.cardIds || zones[viewingZone.zone].slice(0, viewingZone.amount);
            const displayIds = rawIds.filter(id => zones[viewingZone.zone].includes(id));

            if (displayIds.length === 0) {
              return <div className="opacity-10 font-black text-2xl uppercase tracking-[0.5em] py-4 px-10">Empty</div>;
            }
            
            return displayIds.map(id => {
              if (!cards[id]) return null;
              const virtualCard = {
                ...cards[id],
                face: (viewingZone.mode === 'private' && !viewingZone.zone.startsWith(currentPlayer) ? 'down' : 'up'),
                position: 'vertical'
              };
              return (
                <div 
                  key={id} 
                  className="hover:scale-105 hover:-translate-y-2 transition-all duration-300 shrink-0 w-14 md:w-16 drop-shadow-xl cursor-pointer"
                  onClick={(e) => {
                    if (virtualCard.face === 'up') {
                      setPreviewCard(virtualCard as GameCard);
                    }
                    handleCardClick(virtualCard as GameCard, e);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleContextMenu(e, virtualCard as GameCard, viewingZone.zone);
                  }}
                >
                  <Card
                    card={virtualCard as GameCard}
                    zone={viewingZone.zone}
                    onHover={(c) => handleCardHover(c, viewingZone.zone)}
                    onLeave={() => handleCardHover(null)}
                    onClick={handleCardClick}
                    onDoubleClick={handleCardDoubleClick}
                    onContextMenu={(e, c) => handleContextMenu(e, c, viewingZone.zone)}
                  />
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
