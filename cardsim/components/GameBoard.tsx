"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  PointerSensor, 
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection,
  closestCorners,
  closestCenter,
  pointerWithin,
  MeasuringStrategy
} from '@dnd-kit/core';
import { useGameStore, GameCard, ZoneName, PlayerId, PHASES } from '../store/gameStore';
import { DroppableZone } from './DroppableZone';
import { Card } from './Card';
import { RefreshCcw, LogOut, Search, Swords, Shield, Droplet, X, Eye, EyeOff, Layers, Shuffle, ArrowDownCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlacementMenu {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
}

interface DeckMenuState {
  pid: PlayerId;
  x: number;
  y: number;
}

interface ViewModalState {
  zone: ZoneName;
  mode: 'full' | 'private' | 'reveal';
  amount?: number;
}

export function GameBoard({ onExit }: { onExit: () => void }) {
  const { cards, zones, initializeGame, moveCard, drawCards, shuffleDeck, toggleTapped, toggleFace, currentPhase, currentPlayer, nextPhase, topToMana, topToShield, topToGraveyard } = useGameStore();
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [hoveredCard, setHoveredCard] = useState<GameCard | null>(null);
  const [viewingZone, setViewingZone] = useState<ViewModalState | null>(null);
  const [deckMenu, setDeckMenu] = useState<DeckMenuState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [drawAmount, setDrawAmount] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });
  const [placementMenu, setPlacementMenu] = useState<PlacementMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

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
    if (card) {
      setActiveCard(card);
      isDraggingRef.current = true;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    // Provide a tiny delay before allowing clicks again, to drop the trailing onClick from mouseup.
    setTimeout(() => { isDraggingRef.current = false; }, 50);

    const cardId = active.id as string;
    let fromZone: ZoneName | undefined = active.data.current?.fromZone as ZoneName;
    
    // Fallback: manually find fromZone if data was lost
    if (!fromZone) {
      for (const [zoneName, cardIds] of Object.entries(zones)) {
        if (cardIds.includes(cardId)) {
          fromZone = zoneName as ZoneName;
          break;
        }
      }
    }

    let toZone = over?.id as ZoneName;
    
    // Fallback for hand overlapping issue directly mapping to parent hand bounds if pointer is over hand region
    const overIdStr = String(over?.id || "");
    if (overIdStr.includes('hand_wrapper')) {
       toZone = (cardId.startsWith('p1') ? 'p1_hand' : 'p2_hand') as ZoneName; 
    }

    console.log('Drag End Event:', { cardId, fromZone, toZone, overId: over?.id });

    if (fromZone && toZone) {
      console.log(`Moving card ${cardId} from ${fromZone} to ${toZone}`);
      moveCard(cardId, fromZone, toZone);
    } else {
      console.log('Drop ignored: no valid target zone detected.');
    }
  };

  const handleCardClick = (card: GameCard, event?: React.MouseEvent) => {
    if (isDraggingRef.current) return; // Ignore click triggered by releasing drag
    
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
      setDeckMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
         setPlacementMenu(null);
         setDeckMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [placementMenu]);

  if (!mounted) return null;

  const handleDeckAction = (action: string, pid: PlayerId) => {
    setDeckMenu(null);
    if (action === 'Draw') {
      drawCards(pid, 1);
    } else if (action === 'Charge Mana') {
      topToMana(pid);
    } else if (action === 'Add Shield') {
      topToShield(pid);
    } else if (action === 'Shuffle') {
      shuffleDeck(pid);
    } else if (action === 'Send to Graveyard') {
      const amountStr = window.prompt('Enter amount (X) to send to Graveyard:', '1');
      if (amountStr) topToGraveyard(pid, parseInt(amountStr) || 1);
    } else if (action === 'View Top') {
      const amountStr = window.prompt('Enter amount (X) to view privately:', '1');
      if (amountStr) setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: 'private', amount: Math.max(1, parseInt(amountStr) || 1) });
    } else if (action === 'Reveal Top') {
      const amountStr = window.prompt('Enter amount (X) to reveal to both:', '1');
      if (amountStr) setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: 'reveal', amount: Math.max(1, parseInt(amountStr) || 1) });
    } else if (action === 'View Full Deck') {
      setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: 'full' });
    }
  };

  const renderPlayerBoard = (pid: PlayerId, reversed: boolean = false) => {
    const r = reversed;
    return (
      <div className={`w-full flex-1 flex flex-col gap-2 ${r ? 'rotate-180' : ''} min-h-0`}>
        
        {/* Row 1 (Closest to center) - Attack Zone */}
        <DroppableZone id={`${pid}_attackZone`} title="Battle Zone" className="flex-[1.5] min-h-[6rem] bg-red-500/5 border-red-500/20">
          {zones[`${pid}_attackZone`].map(id => (
            <div key={id} className={`${r ? 'rotate-180' : ''}`}>
               <Card card={cards[id]} zone={`${pid}_attackZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
            </div>
          ))}
        </DroppableZone>

        {/* Row 2 - Shields & Mana */}
        <div className="flex gap-2 min-h-[6.5rem] flex-1">
           <DroppableZone id={`${pid}_shields`} title="Shield Zone" className="flex-1 bg-blue-500/5 border-blue-500/20">
             {zones[`${pid}_shields`].map(id => (
               <div key={id} className={`shrink-0 ${r ? 'rotate-180' : ''}`}>
                 <Card card={cards[id]} zone={`${pid}_shields` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
               </div>
             ))}
           </DroppableZone>
           
           <DroppableZone id={`${pid}_manaZone`} title="Maná" className="flex-[1.5] bg-emerald-500/5 border-emerald-500/20">
             {zones[`${pid}_manaZone`].map(id => (
               <div key={id} className={`shrink-0 ${r ? 'rotate-180' : ''}`}>
                 <Card card={cards[id]} zone={`${pid}_manaZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
               </div>
             ))}
           </DroppableZone>
        </div>

        {/* Row 3 - Hand, Deck, Cemetery & Extras */}
        <div className="flex gap-2 min-h-[7.5rem] shrink-0 items-end">
          
          {/* Left Extra Zones */}
          <div className="flex gap-2 shrink-0 self-end">
            <DroppableZone id={`${pid}_hyperspatial`} title="Hiper" compact onView={() => setViewingZone({ zone: `${pid}_hyperspatial` as ZoneName, mode: 'full'})}>
               <div className="relative w-full h-full flex items-center justify-center">
                {zones[`${pid}_hyperspatial`].map((id) => (
                  <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                    <Card card={cards[id]} zone={`${pid}_hyperspatial` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>

            <DroppableZone id={`${pid}_gachi`} title="Gachi" compact onView={() => setViewingZone({ zone: `${pid}_gachi` as ZoneName, mode: 'full'})}>
               <div className="relative w-full h-full flex items-center justify-center">
                {zones[`${pid}_gachi`].map((id) => (
                  <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                    <Card card={cards[id]} zone={`${pid}_gachi` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>

            <DroppableZone id={`${pid}_banishZone`} title="Desterr." compact onView={() => setViewingZone({ zone: `${pid}_banishZone` as ZoneName, mode: 'full'})}>
               <div className="relative w-full h-full flex items-center justify-center">
                {zones[`${pid}_banishZone`].map((id) => (
                  <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                    <Card card={cards[id]} zone={`${pid}_banishZone` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>
          </div>

          {/* Hand */}
          <DroppableZone 
            id={`${pid}_hand`} 
            title="Mano" 
            className="flex-1 bg-indigo-500/5 border-indigo-500/20 self-stretch min-w-[10rem]"
          >
            {zones[`${pid}_hand`].map(id => (
              <div
                key={id}
                className={cn(
                  "relative group mb-1 transition-transform hover:-translate-y-2",
                  placementMenu?.card.id === id ? 'ring-2 ring-yellow-400 rounded-lg' : ''
                )}
              >
                <div className={`${r ? 'rotate-180' : ''}`}>
                  <Card
                    card={cards[id]}
                    zone={`${pid}_hand` as ZoneName}
                    onHover={setHoveredCard}
                    onClick={(card, e) => handleCardClick(card, e)}
                  />
                </div>
              </div>
            ))}
          </DroppableZone>

          {/* Controls */}
          <div className="flex flex-col gap-1 w-20 shrink-0 self-end bg-black/20 p-1.5 rounded-lg border border-white/5">
            <div className="flex items-center gap-1 bg-black/40 rounded px-1 py-1 border border-white/10" title="Cantidad a robar con doble clic">
              <button 
                onClick={() => setDrawAmount(prev => ({ ...prev, [pid]: Math.max(1, prev[pid] - 1) }))}
                className="text-slate-400 hover:text-white px-1 leading-none font-bold flex-1"
              >-</button>
              <span className="text-xs font-bold w-4 text-center">{drawAmount[pid]}</span>
              <button 
                onClick={() => setDrawAmount(prev => ({ ...prev, [pid]: prev[pid] + 1 }))}
                className="text-slate-400 hover:text-white px-1 leading-none font-bold flex-1"
              >+</button>
            </div>
            <button onClick={() => shuffleDeck(pid)} className="bg-slate-600 w-full hover:bg-slate-500 text-white rounded py-1 text-[10px] font-bold shadow-sm transition-colors mt-auto">Revolver</button>
          </div>

          {/* Right Extra Zones (Deck & Cemetery) */}
          <div className="flex gap-2 shrink-0 self-end">
            <DroppableZone id={`${pid}_mainDeck`} title="Mazo" compact onView={() => setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: 'full'})}>
               <div 
                 className="relative w-full h-full flex items-center justify-center cursor-pointer"
                 onDoubleClick={() => drawCards(pid, drawAmount[pid])}
                 onClick={(e) => {
                   e.stopPropagation();
                   const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                   setDeckMenu({ pid, x: rect.left + rect.width / 2, y: rect.top });
                 }}
                 title={`Clic para menú. Doble clic para robar ${drawAmount[pid]} carta(s)`}
               >
                {zones[`${pid}_mainDeck`].map((id) => (
                  <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                    <Card card={cards[id]} zone={`${pid}_mainDeck` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>
            
            <DroppableZone id={`${pid}_cemetery`} title="Cementerio" compact onView={() => setViewingZone({ zone: `${pid}_cemetery` as ZoneName, mode: 'full'})}>
               <div className="relative w-full h-full flex items-center justify-center">
                {zones[`${pid}_cemetery`].map((id) => (
                  <div key={id} className={`absolute inset-0 ${r ? 'rotate-180' : ''}`}>
                    <Card card={cards[id]} zone={`${pid}_cemetery` as ZoneName} onHover={setHoveredCard} onClick={handleCardClick} />
                  </div>
                ))}
              </div>
            </DroppableZone>
          </div>

        </div>

      </div>
    );
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
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
          
          {/* Phase Tracker - Center */}
          <div className="w-full h-6 flex items-center justify-center relative shrink-0 z-10 my-0.5 pointer-events-none">
            <div className="absolute w-full h-px bg-slate-700/50 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="relative flex items-center bg-[#0f172a] px-2 gap-1.5 border border-slate-700/50 rounded-full py-0.5 shadow-xl scale-95 pointer-events-auto">
              <div className="text-[10px] font-black uppercase tracking-wider w-8 text-center" style={{ color: currentPlayer === 'p1' ? '#3b82f6' : '#ef4444' }}>
                {currentPlayer}
              </div>
              <div className="flex bg-slate-800/80 rounded-full overflow-hidden p-0.5 shadow-inner shadow-black/50">
                {PHASES.map((phase) => (
                  <div 
                    key={phase} 
                    className={cn(
                      "px-2 py-0.5 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
                      currentPhase === phase 
                        ? (currentPlayer === 'p1' ? "bg-blue-600 text-white shadow-sm shadow-blue-500/50" : "bg-red-600 text-white shadow-sm shadow-red-500/50")
                        : "text-slate-500/70"
                    )}
                  >
                    {phase}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={nextPhase}
                className={cn(
                  "ml-0.5 flex items-center justify-center gap-0.5 hover:scale-105 active:scale-95 text-white rounded-full px-2.5 py-0.5 transition-all group",
                  currentPlayer === 'p1' ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-red-600 hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                )}
              >
                <span className="font-extrabold text-[9px] uppercase tracking-wider">Next</span>
                <span className="text-[7px] opacity-80 group-hover:opacity-100 uppercase tracking-wide">▶</span>
              </button>
            </div>
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
                  Battle Zone
                </button>
                <button
                  onClick={() => handlePlaceCard(`${placementMenu.card.owner}_shields` as ZoneName)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white transition-all text-xs font-semibold"
                >
                  <Shield size={14} />
                  Shield Zone
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

        {/* Deck Menu */}
        {deckMenu && (
           <div
             className="fixed z-[200] flex flex-col gap-1 w-48"
             style={{
               left: Math.min(deckMenu.x - 90, window.innerWidth - 200),
               top: Math.max(deckMenu.y - 200, 8),
             }}
           >
             <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-2 shadow-2xl flex flex-col gap-1">
               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 px-1 flex justify-between items-center border-b border-white/10 pb-1">
                 <span>Deck Actions</span>
               </div>
               <button onClick={() => handleDeckAction('Draw', deckMenu.pid)} className="text-left px-3 py-1.5 hover:bg-white/10 rounded text-xs text-white transition-colors">Draw</button>
               <button onClick={() => handleDeckAction('Charge Mana', deckMenu.pid)} className="text-left px-3 py-1.5 hover:bg-emerald-500/20 text-emerald-300 rounded text-xs transition-colors">Charge Mana</button>
               <button onClick={() => handleDeckAction('Add Shield', deckMenu.pid)} className="text-left px-3 py-1.5 hover:bg-blue-500/20 text-blue-300 rounded text-xs transition-colors">Add Shield</button>
               <div className="h-px bg-white/10 my-0.5"></div>
               <button onClick={() => handleDeckAction('Shuffle', deckMenu.pid)} className="text-left px-3 py-1.5 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors">Shuffle</button>
               <div className="h-px bg-white/10 my-0.5"></div>
               <button onClick={() => handleDeckAction('Send to Graveyard', deckMenu.pid)} className="text-left px-3 py-1.5 hover:bg-purple-500/20 text-purple-300 rounded text-xs transition-colors">Send to Graveyard (X)</button>
               <button onClick={() => handleDeckAction('View Top', deckMenu.pid)} className="text-left flex items-center justify-between px-3 py-1.5 hover:bg-yellow-500/20 text-yellow-300 rounded text-xs transition-colors">View Top (X) <EyeOff size={12} /></button>
               <button onClick={() => handleDeckAction('Reveal Top', deckMenu.pid)} className="text-left flex items-center justify-between px-3 py-1.5 hover:bg-orange-500/20 text-orange-300 rounded text-xs transition-colors">Reveal Top (X) <Eye size={12} /></button>
               <button onClick={() => handleDeckAction('View Full Deck', deckMenu.pid)} className="text-left flex items-center justify-between px-3 py-1.5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors">View Full Deck <Layers size={12} /></button>
             </div>
           </div>
        )}

        {/* Modal Viewer */}
        {viewingZone && (
          <div className="absolute inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center p-8 pointer-events-auto overflow-hidden">
            <div className="flex justify-between items-center w-full max-w-6xl mb-4 text-white p-4 bg-slate-900/50 rounded-2xl border border-white/10 shadow-lg">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50 flex items-center gap-3">
                  {viewingZone.mode === 'private' && <EyeOff className="text-yellow-400" size={24} />}
                  {viewingZone.mode === 'reveal' && <Eye className="text-orange-400" size={24} />}
                  {viewingZone.mode === 'full' && <Layers className="text-slate-400" size={24} />}
                  {viewingZone.zone.replace('_', ' ')}
                  {viewingZone.amount ? ` (Top ${viewingZone.amount})` : ''}
                </h2>
                <div className="text-xs text-slate-400 bg-black/40 px-3 py-1 rounded inline-flex">
                  {viewingZone.mode === 'private' ? 'Confidential: You are viewing these cards privately. Opponent supposedly sees backs.' 
                    : viewingZone.mode === 'reveal' ? 'Public: Both players can see these cards.'
                    : 'Viewing all contents.'} Drag and drop to interact.
                </div>
              </div>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setViewingZone(null)} 
                   className="font-bold bg-white/10 hover:bg-white/20 px-8 py-3 rounded-xl transition-all border border-white/10 uppercase tracking-widest text-sm shadow-xl"
                 >
                   Cerrar
                 </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 overflow-y-auto max-h-[75vh] w-full max-w-6xl justify-center items-start bg-slate-800/20 p-8 rounded-2xl border border-white/5 shadow-2xl custom-scrollbar">
              {zones[viewingZone.zone].length === 0 ? (
                <div className="text-white/50 italic py-12 text-lg">Empty Zone</div>
              ) : (
                (() => {
                  const itemsToRender = viewingZone.amount 
                    ? zones[viewingZone.zone].slice(0, Math.min(viewingZone.amount, zones[viewingZone.zone].length)) 
                    : zones[viewingZone.zone];
                  return itemsToRender.map(id => (
                    <div key={id} className="transition-transform hover:-translate-y-4 hover:scale-110 hover:z-10 cursor-pointer shadow-lg">
                      <Card 
                        card={{
                          ...cards[id], 
                          position: 'vertical',
                          // Override face down if public reveal or owner view (since it's a local sim, we render it up if not strictly opponent view. We default to up for "View")
                          face: viewingZone.mode === 'private' ? 'up' : viewingZone.mode === 'reveal' ? 'up' : cards[id].face
                        }} 
                        zone={viewingZone.zone}
                        onHover={setHoveredCard} 
                        onClick={handleCardClick} 
                      />
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        )}

      </div>
    </DndContext>
  );
}
