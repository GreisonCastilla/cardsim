"use client";

import React from "react";
import { GameCard, ZoneName } from "../store/gameStore";
import { cn } from "../lib/utils";

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
  cycleFace?: (id: string) => void;
  setViewingZone: (state: any) => void;
  setContextMenu: (state: any) => void;
  moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName, index?: number) => void;
  startTargeting: (sourceId: string, type: 'attack' | 'block' | 'evolve' | 'stack') => void;
  currentPlayer: string;
  viewingZone?: { zone: ZoneName; mode: string } | null;
  cards: Record<string, GameCard>;
  onManaRequest?: (cardIds: string[], fromZone: ZoneName, toZone: ZoneName) => void;
}

export function ContextMenu({
  contextMenu,
  toggleTapped,
  toggleFace,
  cycleFace,
  setViewingZone,
  setContextMenu,
  moveCard,
  startTargeting,
  currentPlayer,
  viewingZone,
  cards,
  onManaRequest,
}: ContextMenuProps) {
  const [menuView, setMenuView] = React.useState<'main' | 'sendTo'>('main');

  React.useEffect(() => {
    setMenuView('main');
  }, [contextMenu?.card.id]);

  const isLayer = React.useMemo(() => {
    if (!contextMenu) return false;
    return Object.values(cards).some(c => c.underlyingCards?.includes(contextMenu.card.id));
  }, [cards, contextMenu]);

  if (!contextMenu) return null;

  const currentCard = contextMenu.card;
  const isInsideViewModal = viewingZone && viewingZone.zone === contextMenu.zone;

  if (isLayer) {
    const owner = currentCard.owner;
    const zone = contextMenu.zone;
    const id = currentCard.id;

    const layerItems = [
      { label: "Play to Field", color: "hover:bg-amber-600/10 text-amber-300", action: () => moveCard(id, zone, `${owner}_attackZone_front` as ZoneName) },
      { label: "To Hand", color: "hover:bg-blue-600/10 text-blue-300", action: () => moveCard(id, zone, `${owner}_hand` as ZoneName) },
      { label: "To Mana", color: "hover:bg-emerald-600/10 text-emerald-300", action: () => moveCard(id, zone, `${owner}_manaZone` as ZoneName) },
      { label: "To Shield", color: "hover:bg-cyan-600/10 text-cyan-300", action: () => moveCard(id, zone, `${owner}_shields` as ZoneName) },
      { label: "To Grave", color: "hover:bg-red-600/10 text-red-300", action: () => moveCard(id, zone, `${owner}_cemetery` as ZoneName) },
      { label: "To Top Deck", color: "hover:bg-white/5 text-white/50", action: () => moveCard(id, zone, `${owner}_mainDeck` as ZoneName, 0) },
      { label: "To Bottom Deck", color: "hover:bg-white/5 text-white/50", action: () => moveCard(id, zone, `${owner}_mainDeck` as ZoneName, 999) },
    ];

    return (
      <div
        className="fixed z-[30000]"
        style={{ 
          left: Math.min(contextMenu.x, window.innerWidth - 160), 
          top: Math.min(contextMenu.y, window.innerHeight - 250),
          perspective: "1100px" 
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          className="bg-[#090c12]/98 backdrop-blur-xl border border-white/10 p-0 shadow-4xl min-w-[150px] pointer-events-auto rounded-xl overflow-hidden"
          style={{
            transform: "rotateX(18deg) scale(0.95)",
            transformStyle: "preserve-3d",
            transformOrigin: "center center"
          }}
        >
          <div className="text-[7.5px] text-white/20 uppercase font-black px-4 py-2 border-b border-white/5 tracking-widest bg-white/5">Layer Actions</div>
        <div className="flex flex-col max-h-[160px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
          {layerItems.map((item, i) => (
            <button
              key={item.label}
              onMouseDown={(e) => { e.stopPropagation(); item.action(); setContextMenu(null); }}
              className={`w-full px-4 py-2 hover:bg-white/10 text-white text-[8px] font-black text-left uppercase tracking-widest transition-colors${i > 0 ? " border-t border-white/5" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        </div>
      </div>
    );
  }

  // Specific menu for LOOK / REVEAL windows
  if (isInsideViewModal) {
    const owner = currentCard.owner;
    const zone = contextMenu.zone;
    const id = currentCard.id;

    const menuItems = [
      {
        label: "To Hand",
        color: "hover:bg-blue-600/10 text-blue-300",
        action: () => { moveCard(id, zone, `${owner}_hand` as ZoneName); setContextMenu(null); }
      },
      {
        label: "To Play",
        color: "hover:bg-amber-600/10 text-amber-300",
        action: () => { moveCard(id, zone, `${owner}_attackZone_back` as ZoneName); setContextMenu(null); }
      },
      {
        label: "Play Face Down",
        color: "hover:bg-slate-600/10 text-slate-300",
        action: () => { 
          moveCard(id, zone, `${owner}_attackZone_front` as ZoneName); 
          toggleFace(id);
          setContextMenu(null); 
        }
      },
      {
        label: "To Mana",
        color: "hover:bg-emerald-600/10 text-emerald-300",
        action: () => { 
          if (onManaRequest) {
            onManaRequest([id], zone, `${owner}_manaZone` as ZoneName);
          } else {
            moveCard(id, zone, `${owner}_manaZone` as ZoneName);
          }
          setContextMenu(null); 
        }
      },
      {
        label: "To Shield",
        color: "hover:bg-cyan-600/10 text-cyan-300",
        action: () => { moveCard(id, zone, `${owner}_shields` as ZoneName); setContextMenu(null); }
      },
      {
        label: "Under Stack",
        color: "hover:bg-indigo-600/10 text-indigo-300",
        action: () => { startTargeting(id, 'stack'); setContextMenu(null); }
      },
      {
        label: "To Grave",
        color: "hover:bg-red-600/10 text-red-300",
        action: () => { moveCard(id, zone, `${owner}_cemetery` as ZoneName); setContextMenu(null); }
      },
      {
        label: "To Bottom Deck",
        color: "hover:bg-white/5 text-white/50",
        action: () => { moveCard(id, zone, `${owner}_mainDeck` as ZoneName, 999); setContextMenu(null); }
      },
      {
        label: "To Top Deck",
        color: "hover:bg-white/5 text-white/50",
        action: () => { moveCard(id, zone, `${owner}_mainDeck` as ZoneName, 0); setContextMenu(null); }
      },
    ];

    const MENU_HEIGHT = 200;
    const MENU_WIDTH = 180;
    const smartTop = contextMenu.y + MENU_HEIGHT > window.innerHeight
      ? Math.max(8, contextMenu.y - MENU_HEIGHT)
      : contextMenu.y;
    const smartLeft = Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 8);

    return (
      <div
        className="fixed z-[30000]"
        style={{ left: smartLeft, top: smartTop, perspective: "1100px" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          className="bg-[#090c12]/98 backdrop-blur-xl border border-white/10 p-0 shadow-4xl min-w-[170px] pointer-events-auto rounded-xl overflow-hidden"
          style={{
            transform: "rotateX(18deg) scale(0.95)",
            transformStyle: "preserve-3d",
            transformOrigin: "center center"
          }}
        >
          <div className="text-[8px] text-white/20 uppercase font-black px-5 py-3 border-b border-white/5 tracking-widest bg-white/5">Card Actions</div>
        <div className="flex flex-col max-h-[160px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onMouseDown={(e) => { e.stopPropagation(); item.action(); }}
              className={`w-full px-5 py-3 ${item.color} text-[10px] font-black text-left uppercase tracking-widest transition-colors${i > 0 ? " border-t border-white/5" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[30000]"
      style={{
        left: Math.min(contextMenu.x, window.innerWidth - 360),
        top: Math.min(contextMenu.y, window.innerHeight - 350),
        perspective: "1100px"
      }}
      onContextMenu={e => e.preventDefault()}
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
        <div className="bg-[#090c12]/98 backdrop-blur-2xl border border-white/10 shadow-4xl min-w-[150px] rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
          <div className="text-[7.5px] text-white/20 uppercase font-black px-4 py-2 border-b border-white/5 tracking-widest bg-white/5">Options</div>
          
          <div className="flex flex-col max-h-[240px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
          {contextMenu.zone.includes("manaZone") && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); toggleTapped(currentCard.id); setContextMenu(null); }}
              className="w-full px-4 py-2.5 hover:bg-emerald-600/10 text-white text-[9px] font-black text-left uppercase tracking-widest border-b border-white/5"
            >
              Tap / Untap
            </button>
          )}
          
          {contextMenu.zone.includes("shields") && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); toggleFace(currentCard.id); setContextMenu(null); }}
              className="w-full px-4 py-2.5 hover:bg-cyan-600/10 text-white text-[9px] font-black text-left uppercase tracking-widest border-b border-white/5"
            >
              Reveal / Hide
            </button>
          )}

          {/* Send To Button */}
          <div className="flex flex-col mt-auto">
            <div 
              onMouseEnter={() => setMenuView('sendTo')}
              className={cn(
                "w-full px-4 py-2.5 text-[9px] font-black text-left uppercase tracking-widest flex items-center justify-between transition-colors cursor-pointer",
                menuView === 'sendTo' ? "bg-white/10 text-white" : "hover:bg-white/10 text-white/80"
              )}
            >
              SEND TO
              <span className="text-[12px] leading-none mb-0.5 ml-4">›</span>
            </div>
          </div>
        </div>
      </div>

        {/* SEND TO Submenu Panel */}
        {menuView === 'sendTo' && (
          <div className="absolute left-[100%] top-0 ml-1 bg-[#090c12]/98 backdrop-blur-2xl border border-white/10 shadow-4xl min-w-[150px] rounded-xl overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200 flex flex-col h-fit max-h-[300px]">
            <div className="text-[7.5px] text-white/20 uppercase font-black px-4 py-2 border-b border-white/5 tracking-widest bg-white/5">Destinations</div>
            <div className="flex flex-col overflow-y-auto overscroll-contain custom-scrollbar-thin">
              <button
                onPointerDown={(e) => { e.stopPropagation(); moveCard(currentCard.id, contextMenu.zone, `${currentCard.owner}_hand` as ZoneName); setContextMenu(null); }}
                className="w-full px-4 py-2.5 hover:bg-blue-600/20 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-transform group-hover/item:scale-125" /> To Hand
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); moveCard(currentCard.id, contextMenu.zone, `${currentCard.owner}_manaZone` as ZoneName); setContextMenu(null); }}
                className="w-full px-5 py-4 hover:bg-emerald-600/20 text-emerald-100 text-[10px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-transform group-hover/item:scale-125" /> To Mana
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); moveCard(currentCard.id, contextMenu.zone, `${currentCard.owner}_cemetery` as ZoneName); setContextMenu(null); }}
                className="w-full px-5 py-4 hover:bg-red-900/40 text-red-200 text-[10px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] transition-transform group-hover/item:scale-125" /> To Grave
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); moveCard(currentCard.id, contextMenu.zone, `${currentCard.owner}_mainDeck` as ZoneName, 0); setContextMenu(null); }}
                className="w-full px-5 py-4 hover:bg-cyan-900/30 text-cyan-200 text-[10px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5 transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-transform group-hover/item:scale-125" /> To Top Deck
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); moveCard(currentCard.id, contextMenu.zone, `${currentCard.owner}_mainDeck` as ZoneName, 999); setContextMenu(null); }}
                className="w-full px-5 py-4 hover:bg-cyan-900/20 text-cyan-300 text-[10px] font-black text-left uppercase tracking-widest flex items-center gap-3 transition-colors group/item"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 shadow-[0_0_8px_rgba(8,145,178,0.6)] transition-transform group-hover/item:scale-125" /> To Bottom Deck
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
