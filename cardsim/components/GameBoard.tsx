"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { DndContext, DragOverlay, pointerWithin, MeasuringStrategy, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { useGameStore, GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { Card } from "./Card";

// New Components
import { PhaseHud } from "./PhaseHud";
import { NotificationSystem, NotificationState } from "./NotificationSystem";
import { CardPreview } from "./CardPreview";
import { PlayerSection } from "./PlayerSection";
import { HandOverlay } from "./HandOverlay";
import { PlacementMenu } from "./PlacementMenu";
import { ContextMenu } from "./ContextMenu";
import { DeckMenu } from "./DeckMenu";
import { ViewModal } from "./ViewModal";

// New Hooks
import { useGameHotkeys } from "../lib/useGameHotkeys";
import { useGameDnD } from "../lib/useGameDnD";

export function GameBoard({ onExit }: { onExit: () => void }) {
  const {
    cards, zones, initializeGame, moveCard, drawCards, shuffleDeck,
    toggleTapped, toggleFace, currentPhase, currentPlayer, nextPhase,
    topToMana, topToShield, topToGraveyard, untapAll, linkCard, unlinkCard,
  } = useGameStore();

  // ─── States ────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [previewCard, setPreviewCard] = useState<GameCard | null>(null);
  const [viewingZone, setViewingZone] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<any>(null);
  const [placementMenu, setPlacementMenu] = useState<any>(null);
  const [hoveredHand, setHoveredHand] = useState<PlayerId | null>(null);
  const [isBattleHovered, setIsBattleHovered] = useState(false);
  const [deckMenu, setDeckMenu] = useState<any>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Input states for DeckMenu
  const [drawAmt, setDrawAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [manaAmt, setManaAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [graveAmt, setGraveAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [lookAmt, setLookAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [revealAmt, setRevealAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [shieldAmt, setShieldAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [exLifeAmt, setExLifeAmt] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const menuRef = useRef<HTMLDivElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((msg: string, type: 'error' | 'info' = 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPlacementMenu(null);
        setDeckMenu(null);
      }
      if (contextMenu) setContextMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // ─── Custom Hooks ──────────────────────────────────────────────────────────
  useGameHotkeys({
    currentPlayer, drawCards, untapAll, nextPhase, previewCard,
    setPlacementMenu, setDeckMenu, setContextMenu, setViewingZone
  });

  const { handleDragStart, handleDragEnd, handleDragCancel, isDragging } = useGameDnD({
    zones, moveCard, linkCard, showNotification, setActiveCard, setPreviewCard, previewTimerRef: previewTimer
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCardHover = useCallback((card: GameCard | null, zone?: ZoneName) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    if (isDragging.current || !card) {
      setPreviewCard(null);
      return;
    }
    if (card.face === "up") {
      previewTimer.current = setTimeout(() => setPreviewCard(card), 450);
    } else {
      setPreviewCard(null);
    }
  }, [isDragging]);

  const handleCardClick = useCallback((card: GameCard, event?: React.MouseEvent) => {
    if (isDragging.current) return;
    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (!zone) return;

    if (zone.includes("hand") || zone.includes("attackZone") || zone.includes("manaZone")) {
      let px = event?.clientX ?? window.innerWidth / 2;
      let py = (event?.clientY ?? 0) - 20;
      if (event?.currentTarget) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        px = rect.left + 70;
        py = rect.top + 120;
      }
      setPlacementMenu({ card, fromZone: zone, x: px, y: py });
      return;
    }
    if (zone.includes("mainDeck")) {
      setDeckMenu({ pid: card.owner, x: event?.clientX ?? 0, y: event?.clientY ?? 0 });
      return;
    }
    if (zone.includes("shields")) toggleFace(card.id);
  }, [isDragging, zones, toggleFace]);

  const handleCardDoubleClick = useCallback((card: GameCard) => {
    if (isDragging.current) return;
    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (zone && (zone.includes("attackZone") || zone.includes("manaZone"))) {
      toggleTapped(card.id);
    }
  }, [isDragging, zones, toggleTapped]);

  const handleContextMenu = useCallback((e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    if (zone.includes("manaZone") || zone.includes("shields")) {
      e.preventDefault();
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    moveCard(placementMenu.card.id, placementMenu.fromZone, toZone);
    setPlacementMenu(null);
  }, [placementMenu, moveCard]);

  // Deck Action Executors
  const execDraw = (pid: PlayerId) => {
    drawCards(pid, drawAmt[pid] || 1);
    setDrawAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execMana = (pid: PlayerId) => {
    const amt = manaAmt[pid] || 1;
    for (let i = 0; i < amt; i++) topToMana(pid);
    setManaAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execShield = (pid: PlayerId) => {
    const amt = shieldAmt[pid] || 1;
    for (let i = 0; i < amt; i++) topToShield(pid);
    setShieldAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execGrave = (pid: PlayerId) => {
    topToGraveyard(pid, graveAmt[pid] || 1);
    setGraveAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execLook = (pid: PlayerId) => {
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "private", amount: lookAmt[pid] || 1 });
    setDeckMenu(null);
    setLookAmt(p => ({ ...p, [pid]: 0 }));
  };
  const execReveal = (pid: PlayerId) => {
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "reveal", amount: revealAmt[pid] || 1 });
    setDeckMenu(null);
    setRevealAmt(p => ({ ...p, [pid]: 0 }));
  };

  const handleAddExLife = (currentCard: GameCard, amt: number) => {
    for(let i=0; i<amt; i++) {
      const deck = zones[`${currentCard.owner}_mainDeck`];
      if (deck.length > 0) {
        linkCard(deck[0], currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName);
      } else {
        showNotification("No more cards in deck!");
        break;
      }
    }
    setPlacementMenu(null);
  };

  const handleUnlinkAll = (currentCard: GameCard, target: 'hand' | 'cemetery' | 'deckTop' | 'deckBottom') => {
    currentCard.linkedCardIds?.forEach(cid => {
      let zone: ZoneName = `${currentCard.owner}_hand` as ZoneName;
      let index: number | undefined;
      if (target === 'cemetery') zone = `${currentCard.owner}_cemetery` as ZoneName;
      if (target === 'deckTop') { zone = `${currentCard.owner}_mainDeck` as ZoneName; index = 0; }
      if (target === 'deckBottom') zone = `${currentCard.owner}_mainDeck` as ZoneName;
      unlinkCard(cid, currentCard.id, zone, index);
    });
    setPlacementMenu(null);
  };

  const handleUnlinkIndividual = (childId: string, parentCard: GameCard, target: 'hand' | 'cemetery' | 'deckTop' | 'deckBottom') => {
    let zone: ZoneName = `${parentCard.owner}_hand` as ZoneName;
    let index: number | undefined;
    if (target === 'cemetery') zone = `${parentCard.owner}_cemetery` as ZoneName;
    if (target === 'deckTop') { zone = `${parentCard.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === 'deckBottom') zone = `${parentCard.owner}_mainDeck` as ZoneName;
    unlinkCard(childId, parentCard.id, zone, index);
    if (parentCard.linkedCardIds?.length === 1) setPlacementMenu(null);
  };

  const handleSendTo = (card: GameCard, target: 'deckTop' | 'deckBottom' | 'cemetery' | 'hyperspatial' | 'gZone' | 'banishZone') => {
    let zone: ZoneName = `${card.owner}_cemetery` as ZoneName;
    let index: number | undefined;
    if (target === 'deckTop') { zone = `${card.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === 'deckBottom') zone = `${card.owner}_mainDeck` as ZoneName;
    if (target === 'hyperspatial') zone = `${card.owner}_hyperspatial` as ZoneName;
    if (target === 'gZone') zone = `${card.owner}_gZone` as ZoneName;
    if (target === 'banishZone') zone = `${card.owner}_banishZone` as ZoneName;
    
    moveCard(card.id, placementMenu.fromZone, zone, index);
    setPlacementMenu(null);
  };

  if (!mounted) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen w-full bg-[#0f172a] text-slate-400 overflow-hidden font-sans select-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)' }}>
        
        <NotificationSystem notification={notification} />
        <CardPreview previewCard={previewCard} />

        {/* Exit / Surrender Options */}
        <div className="absolute top-4 left-4 z-[999] flex gap-2">
          <button 
            onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres rendirte?")) {
                alert("Te has rendido.");
                onExit();
              }
            }}
            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold text-sm shadow backdrop-blur transition-colors uppercase tracking-wider border border-red-400/50"
          >
            Rendirse
          </button>
          <button 
            onClick={onExit}
            className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-white rounded font-bold text-sm shadow backdrop-blur transition-colors uppercase tracking-wider border border-slate-500/50"
          >
            Salir
          </button>
        </div>

        <main className="flex-1 h-screen flex flex-col relative overflow-hidden bg-[#0a0d14]">
          <PlayerSection
            pid="p2" flipped zones={zones} cards={cards}
            setViewingZone={setViewingZone} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu} setIsBattleHovered={setIsBattleHovered}
          />

          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#00f2ff]/80 shadow-[0_0_15px_rgba(0,242,255,0.6)] z-5 pointer-events-none select-none opacity-50" />

          <PhaseHud currentPhase={currentPhase} currentPlayer={currentPlayer} nextPhase={nextPhase} />

          <PlayerSection
            pid="p1" zones={zones} cards={cards}
            setViewingZone={setViewingZone} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu} setIsBattleHovered={setIsBattleHovered}
          />

          <HandOverlay
            pid="p2" flipped zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
          />
          <HandOverlay
            pid="p1" zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
          />
        </main>

        <DragOverlay dropAnimation={{ duration: 150 }} zIndex={1000}>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        <ContextMenu
          contextMenu={contextMenu} setContextMenu={setContextMenu}
          toggleTapped={toggleTapped} toggleFace={toggleFace} setViewingZone={setViewingZone}
        />

        <PlacementMenu
          placementMenu={placementMenu} setPlacementMenu={setPlacementMenu}
          cards={cards} exLifeAmt={exLifeAmt} setExLifeAmt={setExLifeAmt}
          toggleTapped={toggleTapped} handlePlaceCard={handlePlaceCard} menuRef={menuRef}
          onAddExLife={handleAddExLife} onUnlinkAll={handleUnlinkAll}
          onUnlinkIndividual={handleUnlinkIndividual} onSendTo={handleSendTo}
        />

        <ViewModal
          viewingZone={viewingZone} setViewingZone={setViewingZone} zones={zones} cards={cards}
          currentPlayer={currentPlayer} handleCardHover={handleCardHover}
          handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
        />

        <DeckMenu
          deckMenu={deckMenu} setDeckMenu={setDeckMenu} zones={zones} menuRef={menuRef}
          drawAmt={drawAmt} setDrawAmt={setDrawAmt} manaAmt={manaAmt} setManaAmt={setManaAmt}
          shieldAmt={shieldAmt} setShieldAmt={setShieldAmt} graveAmt={graveAmt} setGraveAmt={setGraveAmt}
          lookAmt={lookAmt} setLookAmt={setLookAmt} revealAmt={revealAmt} setRevealAmt={setRevealAmt}
          execDraw={execDraw} execMana={execMana} execShield={execShield} execGrave={execGrave}
          execLook={execLook} execReveal={execReveal} shuffleDeck={shuffleDeck} setViewingZone={setViewingZone}
        />
      </div>
    </DndContext>
  );
}
