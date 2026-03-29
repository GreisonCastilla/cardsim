"use client";

import React from "react";
import { Plus, Minus, ShieldCheck } from 'lucide-react';
import { GameCard, ZoneName } from "../store/gameStore";

interface PlacementMenuState {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
}

interface PlacementMenuProps {
  placementMenu: PlacementMenuState | null;
  cards: Record<string, GameCard>;
  exLifeAmt: Record<string, number>;
  setExLifeAmt: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  toggleTapped: (id: string) => void;
  handlePlaceCard: (toZone: ZoneName) => void;
  setPlacementMenu: (state: PlacementMenuState | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onAddExLife: (card: GameCard, amt: number) => void;
  onUnlinkAll: (card: GameCard, target: 'hand' | 'cemetery' | 'deckTop' | 'deckBottom') => void;
  onUnlinkIndividual: (childId: string, parentCard: GameCard, target: 'hand' | 'cemetery' | 'deckTop' | 'deckBottom') => void;
  onSendTo: (card: GameCard, target: 'deckTop' | 'deckBottom' | 'cemetery' | 'hyperspatial' | 'gZone' | 'banishZone') => void;
}

export function PlacementMenu({
  placementMenu,
  cards,
  exLifeAmt,
  setExLifeAmt,
  toggleTapped,
  handlePlaceCard,
  setPlacementMenu,
  menuRef,
  onAddExLife,
  onUnlinkAll,
  onUnlinkIndividual,
  onSendTo,
}: PlacementMenuProps) {
  if (!placementMenu) return null;
  
  const currentCard = cards[placementMenu.card.id];
  if (!currentCard) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[1100] bg-black/90 backdrop-blur-md border border-white/5 shadow-3xl min-w-[140px]"
      style={{ 
        left: Math.min(placementMenu.x - 70, window.innerWidth - 150), 
        top: Math.min(Math.max(placementMenu.y - 120, 10), window.innerHeight - 200) 
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col py-1">
        {(placementMenu.fromZone.includes('attackZone') || placementMenu.fromZone.includes('manaZone')) && (
          <button onClick={() => { toggleTapped(currentCard.id); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-white/10 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 bg-white/5"><div className="w-1.5 h-1.5 rounded-full bg-white" /> Tap / Untap</button>
        )}
        
        {!placementMenu.fromZone.includes('attackZone') && (
           <button onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone` as ZoneName)} className="w-full px-4 py-3 hover:bg-blue-900/40 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Play to Battle Zone</button>
        )}

        {placementMenu.fromZone.includes('attackZone') && (
          <div className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-orange-600/10 transition-all border-b border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <ShieldCheck size={10} className="text-orange-500/60 shrink-0" /> 
              <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest truncate">Add EXLife</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); setExLifeAmt(p => ({ ...p, [currentCard.owner]: Math.max(1, (p[currentCard.owner] || 1) - 1) })); }}
                className="w-4 h-4 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[10px] text-white/50"
              >
                <Minus size={8} />
              </button>
              <span className="text-[10px] text-white font-bold w-3 text-center tabular-nums">{exLifeAmt[currentCard.owner] || 1}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setExLifeAmt(p => ({ ...p, [currentCard.owner]: (p[currentCard.owner] || 1) + 1 })); }}
                className="w-4 h-4 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[10px] text-white/50"
              >
                <Plus size={8} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  onAddExLife(currentCard, exLifeAmt[currentCard.owner] || 1);
                }}
                className="ml-1 bg-orange-600 hover:bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-sm shadow-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* EXLife Menu */}
        {currentCard.linkedCardIds && currentCard.linkedCardIds.length > 0 && (
          <div className="relative group">
            <button className="w-full px-4 py-3 hover:bg-orange-900/40 text-orange-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center justify-between border-b border-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <ShieldCheck size={10} className="text-orange-400" /> Unlink EXLife ({currentCard.linkedCardIds.length})
              </div>
              <span className="text-[14px] leading-none mb-0.5 ml-4">›</span>
            </button>
            
            <div className="absolute left-[98%] top-0 ml-1 hidden group-hover:flex flex-col bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl min-w-[200px] z-[1130] max-h-[350px] overflow-visible custom-scrollbar-thin">
              <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-[7px] text-white/40 font-black tracking-[0.2em] uppercase">Unlink All EXLife</span>
              </div>
              <button onClick={() => onUnlinkAll(currentCard, 'hand')} className="w-full px-4 py-2 hover:bg-blue-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Hand</button>
              <button onClick={() => onUnlinkAll(currentCard, 'cemetery')} className="w-full px-4 py-2 hover:bg-red-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Cemetery</button>
              <button onClick={() => onUnlinkAll(currentCard, 'deckTop')} className="w-full px-4 py-2 hover:bg-indigo-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Deck Top</button>
              <button onClick={() => onUnlinkAll(currentCard, 'deckBottom')} className="w-full px-4 py-2 hover:bg-indigo-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Deck Bottom</button>
              
              <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2 mt-1">
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="text-[7px] text-white/40 font-black tracking-[0.2em] uppercase">Individual Cards</span>
              </div>
              {currentCard.linkedCardIds.map((cid, idx) => {
                const lCard = cards[cid];
                return (
                  <div key={cid} className="relative group/lcard border-b border-white/5 last:border-0">
                    <button className="w-full px-4 py-2.5 hover:bg-orange-500/10 text-white text-[8px] font-bold text-left truncate flex items-center justify-between transition-colors">
                      <span className="truncate max-w-[140px]">{lCard?.name || `Card ${idx + 1}`}</span>
                      <span className="text-[10px] ml-2 text-white/40">›</span>
                    </button>
                    
                    <div className="absolute left-[98%] top-[-1px] ml-1.5 hidden group-hover/lcard:flex flex-col bg-[#0b0f17] border border-white/10 shadow-huge min-w-[130px] z-[1140] rounded-sm divide-y divide-white/5">
                      <button onClick={() => onUnlinkIndividual(cid, currentCard, 'hand')} className="w-full px-3 py-2.5 hover:bg-blue-600/20 text-[7px] text-blue-100 font-black text-left uppercase tracking-widest">Hand</button>
                      <button onClick={() => onUnlinkIndividual(cid, currentCard, 'cemetery')} className="w-full px-3 py-2.5 hover:bg-red-600/20 text-[7px] text-red-100 font-black text-left uppercase tracking-widest">Grave</button>
                      <button onClick={() => onUnlinkIndividual(cid, currentCard, 'deckTop')} className="w-full px-3 py-2.5 hover:bg-indigo-600/20 text-[7px] text-indigo-100 font-black text-left uppercase tracking-widest">Top Deck</button>
                      <button onClick={() => onUnlinkIndividual(cid, currentCard, 'deckBottom')} className="w-full px-3 py-2.5 hover:bg-indigo-900/40 text-[7px] text-indigo-200 font-black text-left uppercase tracking-widest">Bottom Deck</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative group">
          <button className="w-full px-4 py-3 hover:bg-white/10 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Send To...
            </div>
            <span className="text-[14px] leading-none mb-0.5 ml-4">›</span>
          </button>
          
          <div className="absolute left-[98%] bottom-0 ml-1 hidden group-hover:flex flex-col bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl min-w-[150px] z-[1120] max-h-[200px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
            <button onClick={() => handlePlaceCard(`${currentCard.owner}_hand` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> To Hand</button>
            <button onClick={() => onSendTo(currentCard, 'deckTop')} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> To Top Deck</button>
            <button onClick={() => onSendTo(currentCard, 'deckBottom')} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-700" /> To Bottom Deck</button>
            <button onClick={() => handlePlaceCard(`${currentCard.owner}_manaZone` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> To Mana</button>
            <button onClick={() => handlePlaceCard(`${currentCard.owner}_shields` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Set Shield</button>
            <button onClick={() => onSendTo(currentCard, 'cemetery')} className="w-full px-4 py-3 hover:bg-red-900/40 text-red-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> To GY (Grave)</button>
            <button onClick={() => onSendTo(currentCard, 'hyperspatial')} className="w-full px-4 py-3 hover:bg-blue-900/40 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> To Hyper</button>
            <button onClick={() => onSendTo(currentCard, 'gZone')} className="w-full px-4 py-3 hover:bg-purple-900/40 text-purple-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> To G Zone</button>
            <button onClick={() => onSendTo(currentCard, 'banishZone')} className="w-full px-4 py-3 hover:bg-red-900/40 text-red-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-red-800" /> To Abyss</button>
          </div>
        </div>
      </div>
    </div>
  );
}
