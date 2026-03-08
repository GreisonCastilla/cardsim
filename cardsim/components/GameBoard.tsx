"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  PointerSensor, 
  useSensor, 
  useSensors,
  pointerWithin
} from '@dnd-kit/core';
import { useGameStore, GameCard, ZoneName, PlayerId } from '../store/gameStore';
import { DroppableZone } from './DroppableZone';
import { Card } from './Card';
import { RefreshCcw, LogOut, Search, Swords, Shield, Droplet, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlacementMenu {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
}

export function GameBoard({ onExit }: { onExit: () => void }) {
  const { cards, zones, initializeGame, moveCard, drawCards, shuffleDeck, endTurn, toggleTapped, toggleFace } = useGameStore();
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [hoveredCard, setHoveredCard] = useState<GameCard | null>(null);
  const [viewingZone, setViewingZone] = useState<ZoneName | null>(null);
  const [mounted, setMounted] = useState(false);
  const [drawAmount, setDrawAmount] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });
  const [placementMenu, setPlacementMenu] = useState<PlacementMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    initializeGame();
  }, [initializeGame]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as GameCard;
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const toZone = over.id as ZoneName;
    const fromZone = active.data.current?.fromZone as ZoneName;

    if (fromZone && fromZone !== toZone) {
      moveCard(cardId, fromZone, toZone);
    }
  };

  const handleCardClick = (card: GameCard, event?: React.MouseEvent) => {
    let currentZone: ZoneName | undefined;
    for (const [zoneName, cardIds] of Object.entries(zones)) {
      if (cardIds.includes(card.id)) {
        currentZone = zoneName as ZoneName;
        break;
      }
    }

    if (currentZone?.includes('hand')) {
      // Show placement menu for hand cards
      if (event) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setPlacementMenu({
          card,
          fromZone: currentZone,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
      return;
    }

    if (currentZone?.includes('attackZone') || currentZone?.includes('manaZone')) {
      toggleTapped(card.id);
    } else if (currentZone?.includes('shields')) {
      toggleFace(card.id);
    }
  };

  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    moveCard(placementMenu.card.id, placementMenu.fromZone, toZone);
    setPlacementMenu(null);
  }, [placementMenu, moveCard]);

  // Close menu on outside click
  useEffect(() => {
    if (!placementMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPlacementMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlacementMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [placementMenu]);

  if (!mounted) return null;

  const renderPlayerBoard = (pid: PlayerId, reversed: boolean = false) => {
    const r = reversed;
    return (
      <div className={`w-full flex-1 flex flex-col gap-1 ${r ? 'rotate-180' : ''} min-h-0`}>
        
        {/* Support Row (Deck, Cemetery, Banish, Gachi) */}
        <div className="flex gap-2 justify-center shrink-0">
          <DroppableZone id={`${pid}_hyperspatial`} title="Hiperspectral" compact onView={() => setViewingZone(`${pid}_hyperspatial` as ZoneName)}>
             <div className="relative w-full h-full flex items-center justify-center">
              {zones[`${pid}_hyperspatial`].map((id) => (
                <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                  <Card card={cards[id]} zone={`${pid}_hyperspatial` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>

          <DroppableZone id={`${pid}_gachi`} title="Gachi" compact onView={() => setViewingZone(`${pid}_gachi` as ZoneName)}>
             <div className="relative w-full h-full flex items-center justify-center">
              {zones[`${pid}_gachi`].map((id) => (
                <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                  <Card card={cards[id]} zone={`${pid}_gachi` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>

          <div className="flex-1 bg-white/5 mx-2 rounded-lg border border-white/10 flex items-center justify-center gap-2 lg:gap-4">
            <div className="flex items-center gap-1 bg-black/40 rounded px-2 py-1">
              <button 
                onClick={() => setDrawAmount(prev => ({ ...prev, [pid]: Math.max(1, prev[pid] - 1) }))}
                className="text-slate-400 hover:text-white px-1 leading-none font-bold"
              >-</button>
              <span className="text-xs font-bold w-4 text-center">{drawAmount[pid]}</span>
              <button 
                onClick={() => setDrawAmount(prev => ({ ...prev, [pid]: prev[pid] + 1 }))}
                className="text-slate-400 hover:text-white px-1 leading-none font-bold"
              >+</button>
            </div>
            <button onClick={() => drawCards(pid, drawAmount[pid])} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded px-3 py-1 text-xs">Robar</button>
            <button onClick={() => endTurn(pid)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded px-3 py-1 text-xs">Fin Turno</button>
            <button onClick={() => shuffleDeck(pid)} className="bg-slate-600 hover:bg-slate-500 text-white rounded px-3 py-1 text-xs hidden lg:block">Revolver</button>
          </div>

          <DroppableZone id={`${pid}_mainDeck`} title="Mazo" compact onView={() => setViewingZone(`${pid}_mainDeck` as ZoneName)}>
             <div className="relative w-full h-full flex items-center justify-center">
              {zones[`${pid}_mainDeck`].map((id) => (
                <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                  <Card card={cards[id]} zone={`${pid}_mainDeck` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>
          
          <DroppableZone id={`${pid}_cemetery`} title="Cementerio" compact onView={() => setViewingZone(`${pid}_cemetery` as ZoneName)}>
             <div className="relative w-full h-full flex items-center justify-center">
              {zones[`${pid}_cemetery`].map((id) => (
                <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                  <Card card={cards[id]} zone={`${pid}_cemetery` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>
          
          <DroppableZone id={`${pid}_banishZone`} title="Desterrado" compact onView={() => setViewingZone(`${pid}_banishZone` as ZoneName)}>
             <div className="relative w-full h-full flex items-center justify-center">
              {zones[`${pid}_banishZone`].map((id) => (
                <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                  <Card card={cards[id]} zone={`${pid}_banishZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>
        </div>

        {/* Attack Zone */}
        <DroppableZone id={`${pid}_attackZone`} title="Zona de Ataque" className="flex-1 min-h-[6rem] bg-red-500/5 border-red-500/20">
          <div className="w-full flex flex-wrap gap-1 items-center justify-center content-center h-full">
            {zones[`${pid}_attackZone`].map(id => (
              <div key={id} className={`${r ? 'rotate-180' : ''}`}>
                 <Card card={cards[id]} zone={`${pid}_attackZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
              </div>
            ))}
          </div>
        </DroppableZone>

        {/* Shields & Mana */}
        <div className="flex gap-2 min-h-[6rem] flex-1">
           <DroppableZone id={`${pid}_shields`} title="Escudos" className="flex-1 bg-blue-500/5 border-blue-500/20" horizontalScroll>
             <div className="flex w-full justify-center gap-1 pl-1 content-start">
               {zones[`${pid}_shields`].map(id => (
                 <div key={id} className={`shrink-0 ${r ? 'rotate-180' : ''}`}>
                   <Card card={cards[id]} zone={`${pid}_shields` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                 </div>
               ))}
             </div>
           </DroppableZone>
           
           <DroppableZone id={`${pid}_manaZone`} title="Maná" className="flex-[1.5] bg-emerald-500/5 border-emerald-500/20" horizontalScroll>
             <div className="flex gap-1 justify-center w-full">
               {zones[`${pid}_manaZone`].map(id => (
                 <div key={id} className={`shrink-0 ${r ? 'rotate-180' : ''}`}>
                   <Card card={cards[id]} zone={`${pid}_manaZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                 </div>
               ))}
             </div>
           </DroppableZone>
        </div>

        {/* Hand - Floating & Animated */}
        <div className={cn(
           "fixed left-[calc(50%+6rem)] -translate-x-1/2 z-50 flex justify-center w-auto transition-all duration-300 bottom-1 pointer-events-none"
        )}>
           <DroppableZone 
             id={`${pid}_hand`} 
             title={`Mano`} 
             invisible 
             className="w-auto flex justify-center items-end transition-transform duration-300 translate-y-8 hover:translate-y-0 overflow-visible pointer-events-auto" 
           >
              <div className="flex justify-center items-end h-full px-2" style={{ gap: '-12px' }}>
                {zones[`${pid}_hand`].map(id => (
                  <div
                    key={id}
                    className={cn(
                      "transition-all duration-200 hover:-translate-y-6 hover:z-20 -ml-4 first:ml-0 relative group",
                      placementMenu?.card.id === id ? 'ring-2 ring-yellow-400 rounded-lg -translate-y-6 z-20' : ''
                    )}
                  >
                    <Card
                      card={cards[id]}
                      zone={`${pid}_hand` as ZoneName}
                      onHover={setHoveredCard}
                      onClick={(card, e) => handleCardClick(card, e)}
                    />
                  </div>
                ))}
              </div>
            </DroppableZone>
        </div>

      </div>
    );
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
        
        {/* Sidebar */}
        <aside className="w-48 glass border-r border-slate-700 p-3 flex flex-col gap-3 shadow-2xl relative z-20 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">CardSim</h2>
            <div className="flex gap-1.5">
               <button onClick={initializeGame} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Reiniciar">
                 <RefreshCcw size={14} />
               </button>
               <button onClick={onExit} className="p-1.5 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300 transition-colors" title="Salir">
                 <LogOut size={14} />
               </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="h-40 border border-slate-700 bg-slate-800/50 rounded-xl overflow-hidden flex items-center justify-center p-1 relative shrink-0">
              {hoveredCard ? (
                <div className="w-full h-full transform scale-[1.2] origin-top flex items-start justify-center pt-3">
                   <Card card={{...hoveredCard, face: 'up', position: 'vertical'}} isOverlay isStatic />
                </div>
              ) : (
                <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Search size={20} />
                  <span className="text-center text-[11px]">Pasa el cursor sobre<br/>una carta</span>
                </div>
              )}
            </div>
            
            <div className="glass p-2.5 rounded-lg border-slate-700 bg-slate-800/50 overflow-y-auto">
              <h3 className="font-bold text-xs text-blue-300 mb-1 truncate">{hoveredCard?.name || '---'}</h3>
              <p className="text-[10px] text-slate-400 line-clamp-6 leading-relaxed">
                {hoveredCard?.description || 'Pasa el cursor sobre una carta para ver sus detalles.'}
              </p>
              {hoveredCard && (
                <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest border-t border-slate-700 pt-1.5">
                  Dueño: {hoveredCard.owner}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Dual Board Area */}
        <main className="flex-1 p-4 flex flex-col gap-5 justify-between relative overflow-hidden">
          {renderPlayerBoard('p2', true)}
          <div className="w-full h-px bg-slate-700/50 relative shrink-0">
             <div className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#0f172a] px-3 font-bold text-slate-600 text-[10px] tracking-widest">VS</div>
          </div>
          {renderPlayerBoard('p1', false)}
        </main>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        {/* Placement Menu */}
        {placementMenu && (
          <div
            ref={menuRef}
            className="fixed z-[200] flex flex-col gap-1"
            style={{
              left: Math.min(placementMenu.x - 80, window.innerWidth - 180),
              top: Math.max(placementMenu.y - 180, 8),
            }}
          >
            {/* Card preview */}
            <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-2 shadow-2xl">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 px-1 flex justify-between items-center">
                <span>Colocar carta</span>
                <button
                  onClick={() => setPlacementMenu(null)}
                  className="text-slate-500 hover:text-white p-0.5 rounded"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="text-xs font-bold text-white px-1 mb-2 truncate max-w-[160px]">{placementMenu.card.name}</div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handlePlaceCard(`${placementMenu.card.owner}_attackZone` as ZoneName)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-white transition-all text-xs font-semibold"
                >
                  <Swords size={14} />
                  Zona de Ataque
                </button>
                <button
                  onClick={() => handlePlaceCard(`${placementMenu.card.owner}_shields` as ZoneName)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white transition-all text-xs font-semibold"
                >
                  <Shield size={14} />
                  Escudos
                </button>
                <button
                  onClick={() => handlePlaceCard(`${placementMenu.card.owner}_manaZone` as ZoneName)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all text-xs font-semibold"
                >
                  <Droplet size={14} />
                  Zona de Maná
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Viewer */}
        {viewingZone && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 pointer-events-auto">
            <div className="flex justify-between items-center w-full max-w-6xl mb-4 text-white">
              <h2 className="text-2xl font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">{viewingZone}</h2>
              <button 
                onClick={() => setViewingZone(null)} 
                className="font-bold bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg transition-colors border border-white/10"
              >
                Cerrar
              </button>
            </div>
            <div className="flex flex-wrap gap-4 overflow-y-auto max-h-[80vh] w-full max-w-6xl justify-center items-start bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl">
              {zones[viewingZone].length === 0 ? (
                <div className="text-white/50 italic py-12">Esta zona está vacía</div>
              ) : (
                zones[viewingZone].map(id => (
                  <div key={id} className="transition-transform hover:scale-110 hover:z-10 cursor-pointer">
                    <Card card={{...cards[id], position: 'vertical'}} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </DndContext>
  );
}
