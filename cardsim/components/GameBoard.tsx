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
  pointerWithin,
  MeasuringStrategy
} from '@dnd-kit/core';
import { useGameStore, GameCard, ZoneName, PlayerId, PHASES } from '../store/gameStore';
import { DroppableZone } from './DroppableZone';
import { Card } from './Card';
import { LogOut, Swords, Shield, Droplet, X, Eye, Layers, Shuffle, ArrowDownCircle, Search, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface PlacementMenu {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
}

interface ContextMenuState {
  card: GameCard;
  zone: ZoneName;
  x: number;
  y: number;
}

interface ViewModalState {
  zone: ZoneName;
  mode: 'full' | 'private' | 'reveal';
  amount?: number;
}

interface DeckMenuState {
  pid: PlayerId;
  x: number;
  y: number;
}

export function GameBoard({ onExit }: { onExit: () => void }) {
  const { cards, zones, initializeGame, moveCard, drawCards, shuffleDeck, toggleTapped, toggleFace, currentPhase, currentPlayer, nextPhase, topToMana, topToShield, topToGraveyard } = useGameStore();
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [hoveredCard, setHoveredCard] = useState<GameCard | null>(null);
  const [isHandHovered, setIsHandHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showHand = isHandHovered || !!activeCard;

  const handleCardHover = useCallback((card: GameCard | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Condición de Visibilidad: la gigantografía SOLO se activa si la carta está 'Boca Arriba'
    if (card && card.face === 'up') {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredCard(card);
      }, 400); // 400ms delay para activación (Hover Delay)
    } else {
      setHoveredCard(null);
    }
  }, []);

  const [viewingZone, setViewingZone] = useState<ViewModalState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [drawAmount, setDrawAmount] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });
  const [placementMenu, setPlacementMenu] = useState<PlacementMenu | null>(null);
  const [deckMenu, setDeckMenu] = useState<DeckMenuState | null>(null);
  const [isInspectingDeck, setIsInspectingDeck] = useState<{ pid: PlayerId, mode: 'private' | 'reveal' } | null>(null);
  const [lookAmount, setLookAmount] = useState<number>(5);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    initializeGame();
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [initializeGame]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as GameCard;
    if (card) {
      setActiveCard(card);
      isDraggingRef.current = true;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setTimeout(() => { isDraggingRef.current = false; }, 50);

    const cardId = active.id as string;
    let fromZone: ZoneName | undefined = active.data.current?.fromZone as ZoneName;

    if (!fromZone) {
      for (const [zoneName, cardIds] of Object.entries(zones)) {
        if (cardIds.includes(cardId)) {
          fromZone = zoneName as ZoneName;
          break;
        }
      }
    }

    let toZone = over?.id as ZoneName;
    if (fromZone && toZone) {
      moveCard(cardId, fromZone, toZone);
    }
  };

  const handleCardClick = (card: GameCard, event?: React.MouseEvent) => {
    if (isDraggingRef.current) return;

    let currentZone: ZoneName | undefined;
    for (const [zoneName, cardIds] of Object.entries(zones)) {
      if (cardIds.includes(card.id)) {
        currentZone = zoneName as ZoneName;
        break;
      }
    }

    if (currentZone?.includes('hand')) {
      // Show contextual popup near the card
      setPlacementMenu({
          card,
          fromZone: currentZone,
          x: event?.clientX || window.innerWidth / 2,
          y: (event?.clientY || 0) - 100, // Offset to appear above card
      });
      return;
    }

    if (currentZone?.includes('attackZone') || currentZone?.includes('manaZone')) {
      toggleTapped(card.id);
    } else if (currentZone?.includes('shields')) {
      toggleFace(card.id);
    }
  };

  const handleDeckClick = (pid: PlayerId, e: React.MouseEvent) => {
    setDeckMenu({ pid, x: e.clientX, y: e.clientY });
  };

  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    moveCard(placementMenu.card.id, placementMenu.fromZone, toZone);
    setPlacementMenu(null);
  }, [placementMenu, moveCard]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPlacementMenu(null);
        setDeckMenu(null);
      }
      setContextMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        setPlacementMenu(null);
        setDeckMenu(null);
        setContextMenu(null);
        setIsInspectingDeck(null);
        setViewingZone(null);
      }
      const key = e.key.toLowerCase();
      if (key === 'd') {
        const state = useGameStore.getState();
        state.drawCards(state.currentPlayer, 1);
      }
      if (key === 'u') {
        const state = useGameStore.getState();
        const pid = state.currentPlayer;
        state.zones[`${pid}_attackZone`].forEach(id => {
           if (state.cards[id].position === 'horizontal') state.toggleTapped(id);
        });
        state.zones[`${pid}_manaZone`].forEach(id => {
           if (state.cards[id].position === 'horizontal') state.toggleTapped(id);
        });
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        useGameStore.getState().nextPhase();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [placementMenu, deckMenu, contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    if (zone.includes('manaZone') || zone.includes('shields')) {
      e.preventDefault();
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
    }
  };

  const renderManaBadge = (pid: PlayerId) => {
    const manaCards = zones[`${pid}_manaZone`];
    if (manaCards.length === 0) return 0;

    const colors = manaCards.reduce((acc, id) => {
        let col = cards[id]?.color || 'white';
        col = col.toLowerCase();
        acc[col] = (acc[col] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex items-center gap-[3px]">
            {Object.entries(colors).map(([color, count]) => {
                let bg = 'bg-slate-300';
                let shadow = '';
                if (color.includes('red') || color.includes('fire')) { bg = 'bg-red-500'; shadow = 'shadow-[0_0_4px_red]'; }
                else if (color.includes('blue') || color.includes('water')) { bg = 'bg-blue-500'; shadow = 'shadow-[0_0_4px_blue]'; }
                else if (color.includes('green') || color.includes('nature')) { bg = 'bg-green-500'; shadow = 'shadow-[0_0_4px_green]'; }
                else if (color.includes('yellow') || color.includes('light')) { bg = 'bg-yellow-400'; shadow = 'shadow-[0_0_4px_yellow]'; }
                else if (color.includes('black') || color.includes('dark')) { bg = 'bg-purple-600'; shadow = 'shadow-[0_0_4px_purple]'; }
                
                return (
                    <div key={color} className={cn(`w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] text-white font-black drop-shadow-md`, bg, shadow)}>
                        {count > 1 ? count : ''}
                    </div>
                );
            })}
        </div>
    );
  };

  const renderPlayerBoard = (pid: PlayerId, reversed: boolean = false) => {
    const r = reversed;
    return (
      <div className={`w-full flex-1 flex flex-col ${r ? 'rotate-180' : ''} min-h-0 relative z-10`}>
        {/* Battle Zone */}
        <div className="flex-[6] w-full flex relative z-10 border-b border-white/5">
          <DroppableZone id={`${pid}_attackZone`} title="Battle Zone" className="flex-1 border-0" count={zones[`${pid}_attackZone`].length}>
            <div className="flex flex-wrap content-start p-2 gap-2 w-full h-full overflow-y-auto custom-scrollbar relative z-10">
              {zones[`${pid}_attackZone`].map(id => (
                <div key={id} className={`shrink-0 ${r ? 'rotate-180' : ''} w-16`}>
                   <Card card={cards[id]} zone={`${pid}_attackZone` as ZoneName} onHover={handleCardHover} onClick={handleCardClick} />
                </div>
              ))}
            </div>
          </DroppableZone>
        </div>

        {/* Resources Section */}
        <div className="flex-[4] w-full flex flex-col relative z-20 min-h-0 bg-black/10">
          <div className="flex-1 w-full flex min-h-0">
            <DroppableZone id={`${pid}_manaZone`} title="Mana" className="flex-[3] bg-green-900/10 backdrop-blur-[10px] shadow-[inset_0_0_30px_rgba(74,222,128,0.03)] border-r border-[rgba(255,255,255,0.05)]" count={renderManaBadge(pid)}>
              <div className="flex items-center w-full h-full pl-3 pr-4 overflow-x-auto overflow-y-hidden custom-scrollbar">
                {zones[`${pid}_manaZone`].map((id, index) => (
                  <div key={id} onContextMenu={(e) => handleContextMenu(e, cards[id], `${pid}_manaZone` as ZoneName)} className={cn("shrink-0 transition-all duration-300 hover:z-30 hover:-translate-y-1 w-12", index > 0 ? "-ml-6 hover:ml-1" : "", r ? 'rotate-180' : '')}>
                    <Card card={cards[id]} zone={`${pid}_manaZone` as ZoneName} onHover={handleCardHover} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>
            <DroppableZone id={`${pid}_shields`} title="Shields" className="flex-[2] bg-yellow-900/10 backdrop-blur-[10px] shadow-[inset_0_0_30px_rgba(250,204,21,0.03)]" count={zones[`${pid}_shields`].length}>
              <div className="flex items-center w-full h-full pl-3 pr-4 overflow-x-auto overflow-y-hidden custom-scrollbar gap-1">
                {zones[`${pid}_shields`].map((id, index) => (
                  <div key={id} onContextMenu={(e) => handleContextMenu(e, cards[id], `${pid}_shields` as ZoneName)} className={cn("shrink-0 transition-all duration-300 hover:z-30 hover:-translate-y-1 w-12", index > 0 ? "-ml-6 hover:ml-1" : "", r ? 'rotate-180' : '')}>
                    <Card card={cards[id]} zone={`${pid}_shields` as ZoneName} onHover={handleCardHover} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>
          </div>

          <div className="h-10 w-full flex items-center justify-between px-2 shrink-0 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] backdrop-blur-md relative z-10">
            <div className="flex gap-1 shrink-0 h-full items-center">
              {['hyperspatial', 'gachi', 'banishZone'].map(sub => (
                <DroppableZone key={sub} id={`${pid}_${sub}` as ZoneName} title={sub.substring(0,5)} compact onView={() => setViewingZone({ zone: `${pid}_${sub}` as ZoneName, mode: 'full'})}>
                  <div className="absolute top-0 right-1 text-[7px] text-white/40">{zones[`${pid}_${sub}` as ZoneName].length}</div>
                  <div className="relative w-full h-full flex items-center justify-center opacity-40 hover:opacity-100">
                    {zones[`${pid}_${sub}` as ZoneName].map(id => (
                      <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''} w-8 mx-auto`}>
                        <Card card={cards[id]} zone={`${pid}_${sub}` as ZoneName} onHover={handleCardHover} />
                      </div>
                    ))}
                  </div>
                </DroppableZone>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex gap-2 shrink-0 h-full items-center">
              <DroppableZone id={`${pid}_mainDeck`} title="Deck" compact>
                 <div className="absolute -top-3 left-0 w-full text-[7px] text-center text-white/30 truncate">{zones[`${pid}_mainDeck`].length}</div>
                 <div className="relative w-full h-full flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-white/20" onClick={(e) => handleDeckClick(pid, e)}>
                  {zones[`${pid}_mainDeck`].map(id => (
                    <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''} w-8 mx-auto`}><Card card={cards[id]} zone={`${pid}_mainDeck`} onHover={handleCardHover} /></div>
                  ))}
                </div>
              </DroppableZone>
              <DroppableZone id={`${pid}_cemetery`} title="Cem" compact onView={() => setViewingZone({ zone: `${pid}_cemetery`, mode: 'full'})}>
                 <div className="absolute top-0 right-1 text-[7px] text-white/40">{zones[`${pid}_cemetery`].length}</div>
                 <div className="relative w-full h-full flex items-center justify-center opacity-60 hover:opacity-100">
                  {zones[`${pid}_cemetery`].map(id => (
                    <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''} w-8 mx-auto`}><Card card={cards[id]} zone={`${pid}_cemetery`} onHover={handleCardHover} /></div>
                  ))}
                </div>
              </DroppableZone>
            </div>
          </div>
        </div>

        {/* Hand Tray (Retractable Slide-to-Show) */}
        <div 
          onMouseEnter={() => setIsHandHovered(true)}
          onMouseLeave={() => setIsHandHovered(false)}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-0 w-[80%] md:w-[60%] h-[110px] z-[70] pointer-events-none flex flex-col items-center transition-transform duration-300 ease-out",
            showHand ? "translate-y-0" : "translate-y-[50%]"
          )}
        >
            {/* Background gradient changed to pointer-events-none so it doesn't block the bottom objects */}
            <div className={cn("w-full h-full flex flex-1 items-end justify-center pointer-events-none transition-opacity duration-300", showHand ? "opacity-100 bg-gradient-to-t from-black/80 to-transparent" : "opacity-60")}>
              <DroppableZone id={`${pid}_hand`} title="" className="w-full h-full pointer-events-none border-0 bg-transparent flex items-end justify-center" invisible>
                <div className="flex items-end justify-center w-full h-[90px] relative pointer-events-none mb-1">
                  {zones[`${pid}_hand`].map((id, index) => (
                    <div key={id} className={cn("relative transition-all duration-300 hover:-translate-y-[20px] hover:scale-110 hover:z-50 w-16 group pointer-events-auto", index > 0 ? "-ml-8" : "", placementMenu?.card.id === id ? 'ring-2 ring-blue-500 -translate-y-[20px]' : '')}>
                      <div className={cn("transition-all duration-300 drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]", r ? 'rotate-180' : '')}>
                        <Card card={cards[id]} zone={`${pid}_hand`} onHover={handleCardHover} onClick={handleCardClick} />
                      </div>
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 w-1 h-1 rounded-full shadow-[0_0_5px_blue]" />
                    </div>
                  ))}
                </div>
              </DroppableZone>
            </div>
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={pointerWithin} 
      measuring={{ droppable: { strategy: MeasuringStrategy.Always }}}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen w-full bg-[radial-gradient(ellipse_at_center,_#1a1f35_0%,_#05080f_100%)] text-slate-300 overflow-hidden font-[Inter,sans-serif] select-none">
        {/* Floating Hover Preview (Estilo Untap) */}
        {hoveredCard && (
          <div className="fixed top-6 right-6 z-[500] w-64 md:w-80 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4">
              {/* Image Preview (Layer Superior) */}
              <div className="w-48 h-64 md:w-64 md:h-[22rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black/40 flex items-center justify-center relative pointer-events-auto">
                <Card card={{ ...hoveredCard, face: 'up', position: 'vertical' }} isStatic />
              </div>
              
              {/* Minimalist Text Box */}
              <div className="w-full bg-black/40 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-[rgba(255,255,255,0.1)] pointer-events-auto">
                <h3 className="text-sm md:text-base font-black text-white/90 uppercase border-b border-[rgba(255,255,255,0.05)] pb-2 mb-2 tracking-widest">{hoveredCard.name}</h3>
                {/* Scrollable description box */}
                <div className="max-h-32 md:max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  <p className="text-[11px] md:text-xs text-white/70 leading-relaxed font-medium whitespace-pre-wrap">{hoveredCard.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Floating Input for Deck Inspection (Look / Reveal) */}
        {isInspectingDeck && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
             <div className="bg-slate-900 border border-white/20 p-6 flex flex-col gap-4 w-64 shadow-2xl">
                <div className="flex flex-col">
                  <span className="text-white font-black uppercase tracking-tighter text-lg">
                    {isInspectingDeck.mode === 'reveal' ? 'Reveal Top X' : 'Look Top X'}
                  </span>
                  <span className="text-white/30 text-[9px] uppercase font-bold tracking-[0.2em]">
                    {isInspectingDeck.pid === 'p1' ? 'Player 1' : 'Player 2'} Deck
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-1 rounded border border-white/5">
                   <button onClick={() => setLookAmount(prev => Math.max(0, prev - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-white/40 hover:text-white">-</button>
                   <input 
                     type="number" 
                     value={lookAmount || ''} 
                     onChange={(e) => {
                       const val = e.target.value;
                       setLookAmount(val === '' ? 0 : parseInt(val));
                     }}
                     className="flex-1 bg-transparent text-center text-white font-black outline-none focus:text-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                     placeholder="0"
                   />
                   <button onClick={() => setLookAmount(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-white/40 hover:text-white">+</button>
                </div>
                <div className="flex gap-2 pt-2">
                   <button onClick={() => setIsInspectingDeck(null)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all">Cancel</button>
                   <button 
                     onClick={() => {
                       if (lookAmount > 0) {
                         setViewingZone({ 
                           zone: `${isInspectingDeck.pid}_mainDeck` as ZoneName, 
                           mode: isInspectingDeck.mode, 
                           amount: lookAmount 
                         });
                       }
                       setIsInspectingDeck(null);
                     }}
                     className="flex-1 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                   >
                     Confirm
                   </button>
                </div>
             </div>
          </div>
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {renderPlayerBoard('p2', true)}
          
          {/* Subtle separator line for boards */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent relative z-10 shrink-0 pointer-events-none" />
          
          {/* Floating Phase Ribbon (Ultra-Slim Glass HUD) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] flex items-center h-[28px] bg-[rgba(0,0,0,0.3)] backdrop-blur-[5px] border border-[rgba(255,255,255,0.05)] rounded-[30px] px-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] pointer-events-auto">
             {/* Player Indicator */}
             <div className="text-[10px] font-black uppercase tracking-[0.2em] font-[Inter,sans-serif] mr-4 pr-4 border-r border-[rgba(255,255,255,0.1)] flex items-center h-full" style={{ color: currentPlayer === 'p1' ? '#60a5fa' : '#f87171', textShadow: `0 0 8px ${currentPlayer === 'p1' ? 'rgba(96,165,250,0.5)' : 'rgba(248,113,113,0.5)'}` }}>
               {currentPlayer}
             </div>
             
             {/* Phases */}
             <div className="flex gap-4 font-[Inter,sans-serif] relative h-full items-center">
                  {PHASES.map((phase) => {
                    const isActive = currentPhase === phase;
                    return (
                      <div key={phase} className="relative flex items-center justify-center h-full cursor-pointer group" onClick={nextPhase}>
                        {isActive && (
                          <motion.div
                            layoutId="activePhaseLine"
                            className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,1)]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span className={cn(
                          "relative z-10 text-[10px] uppercase tracking-[0.1em] transition-all duration-300 select-none", 
                          isActive 
                            ? "text-blue-200 font-bold drop-shadow-[0_0_6px_rgba(147,197,253,0.8)]" 
                            : "text-white/40 group-hover:text-white/70"
                        )}>{phase}</span>
                      </div>
                    );
                  })}
             </div>
             
             {/* Simple Next Button */}
             <button onClick={nextPhase} className="ml-5 pl-4 border-l border-[rgba(255,255,255,0.1)] h-full flex items-center text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest transition-all">Next ▶</button>
          </div>

          {renderPlayerBoard('p1', false)}
        </main>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>{activeCard ? <Card card={activeCard} isOverlay /> : null}</DragOverlay>

        {placementMenu && (
          <div 
            ref={menuRef}
            className="fixed z-[300] bg-slate-900 border border-white/20 p-1 shadow-2xl min-w-[140px] animate-in fade-in zoom-in duration-150"
            style={{ 
              left: Math.min(placementMenu.x, window.innerWidth - 150), 
              top: Math.max(placementMenu.y, 10) 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[7px] text-white/20 uppercase font-black px-2 py-1 border-b border-white/5 mb-1">Play Card</div>
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => handlePlaceCard(`${placementMenu.card.owner}_attackZone` as ZoneName)} 
                className="group w-full flex items-center gap-2 px-2 py-1.5 hover:bg-blue-600/50 text-white text-[9px] font-bold text-left uppercase tracking-tighter transition-all rounded"
              >
                <Swords size={11} className="text-blue-400 group-hover:text-white" />
                Battle Zone
              </button>
              <button 
                onClick={() => handlePlaceCard(`${placementMenu.card.owner}_manaZone` as ZoneName)} 
                className="group w-full flex items-center gap-2 px-2 py-1.5 hover:bg-emerald-600/50 text-white text-[9px] font-bold text-left uppercase tracking-tighter transition-all rounded"
              >
                <Droplet size={11} className="text-emerald-400 group-hover:text-white" />
                Add to Mana
              </button>
              <button 
                onClick={() => handlePlaceCard(`${placementMenu.card.owner}_shields` as ZoneName)} 
                className="group w-full flex items-center gap-2 px-2 py-1.5 hover:bg-amber-600/50 text-white text-[9px] font-bold text-left uppercase tracking-tighter transition-all rounded"
              >
                <Shield size={11} className="text-amber-400 group-hover:text-white" />
                Set as Shield
              </button>
              <div className="h-px bg-white/5 my-0.5 mx-1" />
              <button 
                onClick={() => { moveCard(placementMenu.card.id, placementMenu.fromZone, `${placementMenu.card.owner}_cemetery` as ZoneName); setPlacementMenu(null); }} 
                className="group w-full flex items-center gap-2 px-2 py-1.5 hover:bg-red-600/50 text-white text-[9px] font-bold text-left uppercase tracking-tighter transition-all rounded"
              >
                <X size={11} className="text-red-400 group-hover:text-white" />
                Discard
              </button>
            </div>
          </div>
        )}

        {viewingZone && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-300">
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/20 shadow-2xl max-w-full max-h-[90vh] flex flex-col p-4 animate-in zoom-in duration-200">
              {/* Minimalist Floating Header */}
              <div className="flex justify-between items-center mb-4 gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                    {viewingZone.mode === 'reveal' ? 'Public Revelation' : 'Private Inspection'}
                  </span>
                  <span className="text-[8px] text-white/30 uppercase font-bold tracking-widest leading-none">
                    {viewingZone.mode === 'reveal' ? 'Shared Visibility' : 'Owner Only'}
                  </span>
                </div>
                <button 
                  onClick={() => setViewingZone(null)} 
                  className="w-6 h-6 flex items-center justify-center hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all rounded-full border border-white/5"
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Fit-Content Horizontal Card Tray */}
              <div className="flex gap-3 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2 px-1 min-h-[160px] md:min-h-[200px] items-center justify-center">
              {zones[viewingZone.zone].length === 0 ? <div className="text-white/10 uppercase font-black text-2xl tracking-[0.5em] mt-20">Empty</div> : (() => {
                  const itemsToRender = viewingZone.amount ? zones[viewingZone.zone].slice(0, viewingZone.amount) : zones[viewingZone.zone];
                  // Asymmetric Visibility Logic:
                  // If viewingZone.mode is 'private', only the owner (matching zone prefix) should see cards UP.
                  // In sandbox pair-play, we can check if viewingZone.zone starts with currentPlayer for strict enforcement,
                  // but here we follow the instruction: "Dueño ve UP, Oponente ve BACK".
                  const isOwner = viewingZone.zone.startsWith(currentPlayer);
                  
                  return itemsToRender.map(id => (
                    <div key={id} className="hover:z-10 transition-transform hover:scale-110">
                      <Card 
                        card={{ 
                          ...cards[id], 
                          position: 'vertical', 
                          face: (viewingZone.mode === 'private') 
                            ? (isOwner ? 'up' : 'down') 
                            : (viewingZone.mode === 'reveal' ? 'up' : cards[id].face) 
                        }} 
                        zone={viewingZone.zone} 
                        onHover={handleCardHover} 
                        onClick={handleCardClick} 
                      />
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {contextMenu && (
          <div className="fixed z-[300] bg-slate-900 border border-white/20 p-1 shadow-2xl min-w-[100px]" style={{ left: Math.min(contextMenu.x, window.innerWidth - 110), top: Math.min(contextMenu.y, window.innerHeight - 80) }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[7px] text-white/20 uppercase font-black px-2 py-1 border-b border-white/5 mb-1">Actions</div>
            {contextMenu.zone.includes('manaZone') && <button onClick={() => { toggleTapped(contextMenu.card.id); setContextMenu(null); }} className="w-full px-2 py-1.5 hover:bg-white/5 text-white text-[9px] font-bold text-left uppercase tracking-tighter">Tap / Untap</button>}
            {contextMenu.zone.includes('shields') && <div className="flex flex-col"><button onClick={() => { setViewingZone({ zone: contextMenu.zone, mode: 'private' }); setContextMenu(null); }} className="px-2 py-1.5 hover:bg-white/5 text-white text-[9px] font-bold text-left uppercase tracking-tighter border-b border-white/5">Break (View)</button><button onClick={() => { toggleFace(contextMenu.card.id); setContextMenu(null); }} className="px-2 py-1.5 hover:bg-white/5 text-white text-[9px] font-bold text-left uppercase tracking-tighter">Reveal / Hide</button></div>}
          </div>
        )}

        {deckMenu && (
          <div 
            ref={menuRef} 
            className="fixed z-[300] bg-slate-900 border border-white/20 p-1 shadow-2xl w-44 animate-in fade-in slide-in-from-bottom-2 duration-200" 
            style={{ 
              left: Math.min(deckMenu.x, window.innerWidth - 180), 
              top: Math.max(deckMenu.y - 220, 10),
              maxHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 text-[8px] text-white/30 uppercase font-black px-2 py-2 flex justify-between items-center border-b border-white/5 mb-1 bg-white/5">
              <span>Deck Actions</span>
              <div className="flex items-center gap-1.5">
                <Layers size={10} />
                <span className="text-white">{zones[`${deckMenu.pid}_mainDeck`].length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-0.5 p-1 max-h-[250px]">
              <div className="flex items-center justify-between hover:bg-blue-600/20 transition-all rounded px-1">
                <button onClick={() => { drawCards(deckMenu.pid, drawAmount[deckMenu.pid]); setDeckMenu(null); }} className="group flex-1 flex items-center gap-2 py-2.5 px-1 text-[10px] text-white font-bold uppercase">
                  <ArrowDownCircle size={12} className="text-blue-400 group-hover:text-white" /> 
                  Draw {drawAmount[deckMenu.pid]}
                </button>
                <div className="flex gap-1 items-center bg-black/40 rounded border border-white/5 px-1">
                   <button onClick={(e) => { e.stopPropagation(); setDrawAmount(prev => ({ ...prev, [deckMenu.pid]: Math.max(1, prev[deckMenu.pid] - 1) }))}} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white">-</button>
                   <button onClick={(e) => { e.stopPropagation(); setDrawAmount(prev => ({ ...prev, [deckMenu.pid]: prev[deckMenu.pid] + 1 }))}} className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white">+</button>
                </div>
              </div>
              <button onClick={() => { topToMana(deckMenu.pid); setDeckMenu(null); }} className="group flex items-center gap-2 px-2 py-2.5 hover:bg-emerald-600/50 text-[10px] text-white font-bold uppercase transition-all rounded">
                <Droplet size={12} className="text-emerald-400 group-hover:text-white" /> Charge Mana
              </button>
              <button onClick={() => { topToShield(deckMenu.pid); setDeckMenu(null); }} className="group flex items-center gap-2 px-2 py-2.5 hover:bg-amber-600/50 text-[10px] text-white font-bold uppercase transition-all rounded">
                <Shield size={12} className="text-amber-400 group-hover:text-white" /> Add Shield
              </button>
              
              <div className="h-px bg-white/10 my-1 mx-2 shrink-0" />
              
              <button onClick={() => { shuffleDeck(deckMenu.pid); setDeckMenu(null); }} className="group flex items-center gap-2 px-2 py-2.5 hover:bg-white/10 text-[10px] text-white/60 font-bold uppercase transition-all rounded">
                <Shuffle size={12} /> Shuffle Deck
              </button>
              <button 
                onClick={() => { setIsInspectingDeck({ pid: deckMenu.pid, mode: 'private' }); setDeckMenu(null); }} 
                className="group flex items-center gap-2 px-2 py-2.5 hover:bg-blue-600/30 text-[10px] text-blue-400 font-bold uppercase transition-all rounded"
              >
                <Search size={12} className="group-hover:text-blue-300" /> Look Top X
              </button>
              <button 
                onClick={() => { setIsInspectingDeck({ pid: deckMenu.pid, mode: 'reveal' }); setDeckMenu(null); }} 
                className="group flex items-center gap-2 px-2 py-2.5 hover:bg-amber-600/30 text-[10px] text-amber-400 font-bold uppercase transition-all rounded"
              >
                <RefreshCcw size={12} className="group-hover:text-amber-300" /> Reveal Top X
              </button>
              <button onClick={() => { topToGraveyard(deckMenu.pid, drawAmount[deckMenu.pid]); setDeckMenu(null); }} className="group flex items-center gap-2 px-2 py-2.5 hover:bg-red-600/30 text-[10px] text-red-400 font-bold uppercase transition-all rounded">
                <X size={12} /> To Grave ({drawAmount[deckMenu.pid]})
              </button>
              <button onClick={() => { setViewingZone({ zone: `${deckMenu.pid}_mainDeck` as ZoneName, mode: 'full' }); setDeckMenu(null); }} className="group flex items-center gap-2 px-2 py-2.5 hover:bg-white/10 text-[10px] text-white/60 font-bold uppercase transition-all rounded">
                <Eye size={12} /> View Deck
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
