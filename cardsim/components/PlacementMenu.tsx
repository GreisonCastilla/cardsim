"use client";

import React from "react";
import { 
  RotateCw, Sword, Layers, Zap, RefreshCw, 
  ArrowUp, Trash2, MoreHorizontal, EyeOff, Eye
} from 'lucide-react';
import { GameCard, ZoneName } from "../store/gameStore";
import { cn } from "../lib/utils";

interface PlacementMenuState {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
  isStackWindow?: boolean;
}

interface PlacementMenuProps {
  placementMenu: PlacementMenuState | null;
  cards: Record<string, GameCard>;
  toggleTapped: (id: string) => void;
  cycleFace?: (id: string) => void;
  handlePlaceCard: (toZone: ZoneName) => void;
  setPlacementMenu: (state: PlacementMenuState | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  startTargeting?: (sourceId: string, type: 'attack' | 'block' | 'evolve' | 'stack') => void;
  onSendTo: (card: GameCard, target: 'deckTop' | 'deckBottom' | 'cemetery' | 'hyperspatial' | 'gZone' | 'banishZone') => void;
  toggleFace: (id: string) => void;
}

export function PlacementMenu({
  placementMenu,
  cards,
  toggleTapped,
  cycleFace,
  handlePlaceCard,
  setPlacementMenu,
  menuRef,
  startTargeting,
  onSendTo,
  toggleFace,
}: PlacementMenuProps) {
  const [menuView, setMenuView] = React.useState<'main' | 'sendTo'>('main');

  React.useEffect(() => {
    setMenuView('main');
  }, [placementMenu?.card.id]);

  const isLayer = React.useMemo(() => {
    if (!placementMenu) return false;
    if (placementMenu.isStackWindow) return true;
    const currentCard = cards[placementMenu.card.id];
    if (!currentCard) return false;
    return Object.values(cards).some(c => c.underlyingCards?.includes(currentCard.id));
  }, [cards, placementMenu]);

  if (!placementMenu) return null;
  
  const currentCard = cards[placementMenu.card.id];
  if (!currentCard) return null;

  if (isLayer) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[30000]"
        style={{ 
          left: Math.min(placementMenu.x - 80, window.innerWidth - 170), 
          top: Math.min(Math.max(placementMenu.y - 150, 10), window.innerHeight - 300),
          perspective: "1100px" 
        }}
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="bg-black/95 backdrop-blur-xl border border-white/10 shadow-4xl min-w-[160px] rounded-xl overflow-hidden"
          style={{
            transform: "rotateX(18deg) scale(0.95)",
            transformStyle: "preserve-3d",
            transformOrigin: "center center"
          }}
        >
          <div className="text-[8px] text-white/30 uppercase font-black px-4 py-3 border-b border-white/5 tracking-[0.2em] bg-white/5">
            Move Layer
          </div>
        <div className="flex flex-col max-h-[160px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
          <button onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone_front` as ZoneName)} className="w-full px-4 py-3 hover:bg-amber-600/20 text-amber-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Play to Field</button>
          <button onClick={() => handlePlaceCard(`${currentCard.owner}_hand` as ZoneName)} className="w-full px-4 py-3 hover:bg-blue-600/20 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> To Hand</button>
          <button onClick={() => onSendTo(currentCard, 'deckTop')} className="w-full px-4 py-3 hover:bg-indigo-600/20 text-indigo-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> To Top Deck</button>
          <button onClick={() => onSendTo(currentCard, 'deckBottom')} className="w-full px-4 py-3 hover:bg-indigo-600/20 text-indigo-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-indigo-700" /> To Bottom Deck</button>
          <button onClick={() => handlePlaceCard(`${currentCard.owner}_manaZone` as ZoneName)} className="w-full px-4 py-3 hover:bg-emerald-600/20 text-emerald-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> To Mana</button>
          <button onClick={() => handlePlaceCard(`${currentCard.owner}_shields` as ZoneName)} className="w-full px-4 py-3 hover:bg-amber-600/20 text-amber-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Set Shield</button>
          <button onClick={() => onSendTo(currentCard, 'cemetery')} className="w-full px-4 py-3 hover:bg-red-600/20 text-red-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 transition-colors"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> To Graveyard</button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[30000]"
      style={{
        left: Math.min(placementMenu.x - 10, window.innerWidth - 180),
        top: Math.min(Math.max(placementMenu.y - 80, 10), window.innerHeight - 300),
        perspective: "1100px"
      }}
      onClick={e => e.stopPropagation()}
      onMouseLeave={() => setMenuView('main')}
    >
      <div 
        className="relative flex"
        style={{
          transform: "rotateX(18deg) scale(0.95)",
          transformStyle: "preserve-3d",
          transformOrigin: "center top"
        }}
      >
        {/* Main Menu Panel */}
        <div className="bg-[#090c12]/98 backdrop-blur-2xl border border-white/10 shadow-4xl min-w-[170px] rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
          <div className="text-[8px] text-white/30 uppercase font-black px-4 py-3 border-b border-white/5 tracking-[0.2em] bg-white/5">
            Card Options
          </div>
          
          <div className="flex flex-col max-h-[260px] overflow-y-auto overscroll-contain custom-scrollbar-thin pb-0.5">
          {/* State Toggles */}
          {!placementMenu.fromZone.includes('hand') && !placementMenu.fromZone.includes('manaZone') && (
            <button
              onClick={() => { toggleTapped(currentCard.id); setPlacementMenu(null); }}
              className={cn(
                "w-full px-3 py-2 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors",
                placementMenu.fromZone.includes('manaZone') ? "hover:bg-emerald-600/20 text-emerald-100" : "hover:bg-white/10 text-white"
              )}
            >
              <RotateCw size={10} className={placementMenu.fromZone.includes('manaZone') ? "text-emerald-500" : "text-white/40"} />
              {placementMenu.fromZone.includes('manaZone') ? "Tap / Untap" : "Rotate Card"}
            </button>
          )}

          {/* Mana Zone exclusive controls: Tap/Untap + Flip Face */}
          {placementMenu.fromZone.includes('manaZone') && (
            <>
              <button
                onClick={() => { toggleTapped(currentCard.id); setPlacementMenu(null); }}
                className="w-full px-3 py-2 hover:bg-emerald-600/20 text-emerald-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
              >
                <RotateCw size={10} className="text-emerald-500" />
                Tap / Untap
              </button>
              <button
                onClick={() => { toggleFace(currentCard.id); setPlacementMenu(null); }}
                className="w-full px-3 py-2 hover:bg-slate-700/30 text-slate-200 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
              >
                {currentCard.face === 'down'
                  ? <Eye size={10} className="text-slate-300" />
                  : <EyeOff size={10} className="text-slate-400" />}
                {currentCard.face === 'down' ? 'Flip Face Up' : 'Flip Face Down'}
              </button>
            </>
          )}

          {/* Combat Actions */}
          {placementMenu.fromZone.includes("attackZone") && (
            <button
              onClick={() => { startTargeting?.(currentCard.id, 'attack'); setPlacementMenu(null); }}
              className="w-full px-3 py-2 hover:bg-red-600/20 text-red-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
            >
              <Sword size={10} className="text-red-500" />
              Declare Attack
            </button>
          )}

          {placementMenu.fromZone.includes('hand') && (() => {
            const type = (currentCard.typeEn || (currentCard as any).type_en || "").toLowerCase();
            return type.includes("evolution") || type.includes("neo") || type.includes("g-neo");
          })() && startTargeting && (
            <button 
              onClick={() => { startTargeting(currentCard.id, 'evolve'); setPlacementMenu(null); }} 
              className="w-full px-3 py-2 hover:bg-indigo-600/20 text-indigo-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
            >
              <Zap size={10} className="text-indigo-500" />
              Evolution...
            </button>
          )}

          {currentCard.backs && currentCard.backs.length > 0 && (
            <button
              onClick={() => { cycleFace?.(currentCard.id); setPlacementMenu(null); }}
              className="w-full px-3 py-2 hover:bg-blue-600/20 text-blue-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
            >
              <RefreshCw size={10} className="text-blue-500" />
              Cycle Face
            </button>
          )}

          {/* Quick Zone Moves */}
          {!placementMenu.fromZone.includes('attackZone') && (
            (placementMenu.fromZone.includes('hand') || placementMenu.fromZone.includes('manaZone')) ? (
              <>
                <button 
                  onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone_front` as ZoneName)} 
                  className="w-full px-3 py-2 hover:bg-amber-600/20 text-amber-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Play to Field
                </button>
                <button 
                  onClick={() => {
                    handlePlaceCard(`${currentCard.owner}_attackZone_front` as ZoneName);
                    toggleFace(currentCard.id);
                  }} 
                  className="w-full px-3 py-2 hover:bg-slate-600/20 text-slate-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(107,114,128,0.6)]" /> Play Face Down
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone_front` as ZoneName)} 
                  className="w-full px-3 py-2 hover:bg-blue-600/20 text-blue-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> Play (Front)
                </button>
                <button 
                  onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone_back` as ZoneName)} 
                  className="w-full px-3 py-2 hover:bg-indigo-600/20 text-indigo-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" /> Play (Back)
                </button>
                <button 
                  onClick={() => {
                    handlePlaceCard(`${currentCard.owner}_attackZone_front` as ZoneName);
                    toggleFace(currentCard.id);
                  }} 
                  className="w-full px-3 py-2 hover:bg-slate-600/20 text-slate-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(107,114,128,0.6)]" /> Play Face Down
                </button>
              </>
            )
          )}

          {/* Specialized Placement - Stack Under (3rd position) */}
          {startTargeting && (
            <button 
              onClick={() => { startTargeting(currentCard.id, 'stack'); setPlacementMenu(null); }} 
              className="w-full px-3 py-2 hover:bg-emerald-600/20 text-emerald-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors"
            >
              <Layers size={10} className="text-emerald-500" />
              Stack Under...
            </button>
          )}

          {/* Send To Button */}
          <div className="flex flex-col border-t border-white/5 mt-auto">
            <div 
              onMouseEnter={() => setMenuView('sendTo')}
              className={cn(
                "w-full px-3 py-2 text-[8px] font-black text-left uppercase tracking-widest flex items-center justify-between transition-colors cursor-pointer",
                menuView === 'sendTo' ? "bg-white/10 text-white" : "hover:bg-white/10 text-white/80"
              )}
            >
              <div className="flex items-center gap-2">
                <MoreHorizontal size={10} />
                SEND TO
              </div>
              <span className="text-[12px] leading-none mb-0.5 ml-4">›</span>
            </div>
          </div>
        </div>
      </div>

        {/* SEND TO Submenu Panel */}
        {menuView === 'sendTo' && (
          <div className="absolute left-[100%] top-0 ml-1 bg-[#090c12]/98 backdrop-blur-2xl border border-white/10 shadow-4xl min-w-[150px] rounded-xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200 flex flex-col h-fit max-h-[300px]">
            <div className="text-[7.5px] text-white/30 uppercase font-black px-3 py-2 border-b border-white/5 tracking-[0.2em] bg-white/5">
              Destinations
            </div>
            <div className="flex flex-col overflow-y-auto overscroll-contain custom-scrollbar-thin">
              {!placementMenu.fromZone.includes('hand') && (
                <button onPointerDown={() => handlePlaceCard(`${currentCard.owner}_hand` as ZoneName)} className="w-full px-4 py-2 hover:bg-blue-600/20 text-blue-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-transform group-hover/item:scale-125" /> To Hand
                </button>
              )}
              {!placementMenu.fromZone.includes('manaZone') && (
                <button onPointerDown={() => handlePlaceCard(`${currentCard.owner}_manaZone` as ZoneName)} className="w-full px-4 py-2 hover:bg-emerald-600/20 text-emerald-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-transform group-hover/item:scale-125" /> To Mana
                </button>
              )}
              <button onPointerDown={() => handlePlaceCard(`${currentCard.owner}_shields` as ZoneName)} className="w-full px-4 py-2 hover:bg-amber-600/20 text-amber-100 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-transform group-hover/item:scale-125" /> To Shields
              </button>
              <button onPointerDown={() => onSendTo(currentCard, 'cemetery')} className="w-full px-4 py-2 hover:bg-red-900/40 text-red-200 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] transition-transform group-hover/item:scale-125" /> To Graveyard
              </button>
              <button onPointerDown={() => onSendTo(currentCard, 'deckTop')} className="w-full px-4 py-2 hover:bg-cyan-900/30 text-cyan-200 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-transform group-hover/item:scale-125" /> To Top Deck
              </button>
              <button onPointerDown={() => onSendTo(currentCard, 'deckBottom')} className="w-full px-4 py-2 hover:bg-cyan-900/20 text-cyan-300 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.6)] transition-transform group-hover/item:scale-125" /> To Bottom Deck
              </button>
              {!placementMenu.fromZone.includes('hand') && !placementMenu.fromZone.includes('manaZone') && (
                <>
                  <button onPointerDown={() => onSendTo(currentCard, 'hyperspatial')} className="w-full px-4 py-2 hover:bg-fuchsia-900/30 text-fuchsia-200 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.6)] transition-transform group-hover/item:scale-125" /> To Hyper
                  </button>
                  <button onPointerDown={() => onSendTo(currentCard, 'gZone')} className="w-full px-4 py-2 hover:bg-indigo-900/30 text-indigo-200 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 border-b border-white/5 transition-colors group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-transform group-hover/item:scale-125" /> To G Zone
                  </button>
                </>
              )}
              <button onPointerDown={() => onSendTo(currentCard, 'banishZone')} className="w-full px-4 py-2 hover:bg-zinc-800/50 text-zinc-300 text-[8px] font-black text-left uppercase tracking-widest flex items-center gap-2 transition-colors group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 shadow-[0_0_8px_rgba(161,161,170,0.6)] transition-transform group-hover/item:scale-125" /> To Abyss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
