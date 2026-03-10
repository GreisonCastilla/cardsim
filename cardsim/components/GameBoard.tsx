"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  useGameStore,
  GameCard,
  ZoneName,
  PlayerId,
  PHASES,
} from "../store/gameStore";
import { DroppableZone } from "./DroppableZone";
import { Card } from "./Card";
import {
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowDownCircle,
  Droplet,
  Shield,
  Search,
  Eye,
  Shuffle,
  Layers,
  ShieldCheck,
  Swords,
  RefreshCcw,
  SkipForward
} from 'lucide-react';
import { cn } from "../lib/utils";

// ─── Local Types ──────────────────────────────────────────────────────────────

interface PlacementMenu {
  card: GameCard;
  fromZone: ZoneName;
  x: number;
  y: number;
  isFromViewingZone?: boolean;
}

interface ContextMenuState {
  card: GameCard;
  zone: ZoneName;
  x: number;
  y: number;
}

interface ViewModalState {
  zone: ZoneName;
  mode: "full" | "private" | "reveal";
  amount?: number;
  specificCardIds?: string[];
}

interface DeckMenuState {
  pid: PlayerId;
  x: number;
  y: number;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function GameBoard({ onExit }: { onExit: () => void }) {
  const {
    cards,
    zones,
    initializeGame,
    moveCard,
    drawCards,
    shuffleDeck,
    toggleTapped,
    toggleFace,
    currentPhase,
    currentPlayer,
    nextPhase,
    topToMana,
    topToShield,
    topToGraveyard,
    untapAll,
    linkCard,
    unlinkCard,
  } = useGameStore();

  // ─── States ────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [previewCard, setPreviewCard] = useState<GameCard | null>(null);
  const [viewingZone, setViewingZone] = useState<ViewModalState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoveredCard, setHoveredCard] = useState<GameCard | null>(null);
  const [placementMenu, setPlacementMenu] = useState<PlacementMenu | null>(null);
  const [hoveredHand, setHoveredHand] = useState<PlayerId | null>(null);
  const [isBattleHovered, setIsBattleHovered] = useState(false);
  const [deckMenu, setDeckMenu] = useState<DeckMenuState | null>(null);
  const [drawAmt, setDrawAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [manaAmt, setManaAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [graveAmt, setGraveAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [lookAmt, setLookAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [revealAmt, setRevealAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [shieldAmt, setShieldAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [exLifeAmt, setExLifeAmt] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });
  const [notification, setNotification] = useState<{ msg: string; type: 'error' | 'info' } | null>(null);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const menuRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = (msg: string, type: 'error' | 'info' = 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ─── Lifecycle & Global Events ─────────────────────────────────────────────
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

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESC to close all
      if (e.key === "Escape") {
        setPlacementMenu(null);
        setDeckMenu(null);
        setContextMenu(null);
        setViewingZone(null);
        return;
      }

      // 2. Global Hotkeys (only if not typing)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'd') {
        drawCards(currentPlayer, 1);
      } else if (key === 'u') {
        untapAll(currentPlayer);
      } else if (key === ' ') {
        if (previewCard) return;
        e.preventDefault();
        nextPhase();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPlayer, drawCards, untapAll, nextPhase, contextMenu, previewCard]);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleCardHover = useCallback((card: GameCard | null, zone?: ZoneName) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }

    if (isDragging.current || !card) {
      setPreviewCard(null);
      return;
    }

    // Condition: Active only on Face Up cards, OR if inspecting a private viewingZone
    const isPrivateView = viewingZone?.mode === 'private' && viewingZone.zone === zone;
    const canSee = card.face === "up" || isPrivateView;

    if (canSee) {
      const cardToPreview = isPrivateView ? { ...card, face: 'up' as const } : card;
      previewTimer.current = setTimeout(() => setPreviewCard(cardToPreview), 450);
    } else {
      setPreviewCard(null);
    }
  }, [viewingZone]);

  const handleDragStart = (e: DragStartEvent) => {
    setPreviewCard(null);
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }

    const card = e.active.data.current?.card as GameCard | undefined;
    if (card) {
      setActiveCard(card);
      isDragging.current = true;
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveCard(null);
    setTimeout(() => { isDragging.current = false; }, 50);

    const cardId = active.id as string;

    // 1. Determine fromZone
    let fromZone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(cardId)) { fromZone = z as ZoneName; break; }
    }

    if (!fromZone || !over) return;

    // 2. Determine if target is a Card or a Zone
    const isTargetingCard = over?.data.current?.isCard;
    const targetCard = over?.data.current?.card as GameCard | undefined;

    let toZone: ZoneName | undefined;
    if (isTargetingCard && targetCard) {
      // Find which zone the target card belongs to
      for (const [z, ids] of Object.entries(zones)) {
        if ((ids as string[]).includes(targetCard.id)) { toZone = z as ZoneName; break; }
      }
    } else {
      toZone = over.id as ZoneName;
    }

    if (!toZone) return;

    // 3. Handle Linking (EXLife) vs Moving, and free positioning
    const isFromDeck = fromZone.includes('mainDeck');
    const isTargetInBattle = toZone.includes('attackZone');

    if (isTargetingCard && targetCard) {
      // Logic for dropping on another card
      if (isTargetInBattle) {
        if (isFromDeck) {
          linkCard(cardId, targetCard.id, fromZone);
        } else {
          showNotification("EXLife can only be added from the Deck.");
        }
      } else if (toZone.includes('shields')) {
        showNotification("You cannot add EXLife to Shield cards.");
      } else if (fromZone !== toZone) {
        // Just move to the zone if dropping on a card in Hand/Mana/etc.
        moveCard(cardId, fromZone, toZone);
      }
    } else {
      // Logic for dropping on a zone (or empty space in attackZone)
      const activeRect = active.rect.current.translated;
      const overRect = over?.rect;

      let bx: number | null | undefined = null; // Default a null (flujo flex normal)
      let by: number | null | undefined = null;

      // Permitir posicionamiento libre ÚNICAMENTE si el destino es la Attack Zone (Tablero principal)
      if (activeRect && overRect && toZone.includes('attackZone')) {
        const centerX = activeRect.left + activeRect.width / 2;
        const centerY = activeRect.top + activeRect.height / 2;

        const wrapperWidth = 64; // w-16 = 4rem = 64px
        const wrapperHeight = wrapperWidth * (4 / 3); // 85.33px

        const isFlipped = toZone.startsWith('p2');
        if (isFlipped) {
          bx = overRect.right - (centerX + wrapperWidth / 2);
          by = overRect.bottom - (centerY + wrapperHeight / 2);
        } else {
          bx = (centerX - wrapperWidth / 2) - overRect.left;
          by = (centerY - wrapperHeight / 2) - overRect.top;
        }
      }

      if (fromZone !== toZone || toZone.includes('attackZone')) {
        moveCard(cardId, fromZone, toZone, undefined, bx ?? undefined, by ?? undefined);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  const handleCardClick = (card: GameCard, event?: React.MouseEvent, isFromViewingZone?: boolean) => {
    if (isDragging.current) return;

    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (!zone) return;

    if (zone.includes("hand") || zone.includes("attackZone") || zone.includes("manaZone") || zone.includes("shields")) {
      let px = event?.clientX ?? window.innerWidth / 2;
      let py = (event?.clientY ?? 0) - 20;

      if (event?.currentTarget) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        // Compensamos los desplazamientos fijos que sufre el menú en su estilo inline (-70 en x, -120 en y).
        // Si queremos que el pop up nazca exactamente desde la esquina superior izquierda de la carta
        // y se posicione tapándola matemáticamente:
        px = rect.left + 70;
        py = rect.top + 120;
      }

      setPlacementMenu({
        card,
        fromZone: zone,
        x: px,
        y: py,
        isFromViewingZone,
      });
      return;
    }

    if (zone.includes("mainDeck")) {
      let px = event?.clientX ?? window.innerWidth / 2;
      let py = event?.clientY ?? window.innerHeight / 2;

      if (event?.currentTarget) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        px = rect.left + rect.width / 2; // Center horizontally
        // Para P1 (abajo), el hud se sale por el top físico. Tomamos el rect.top.
        // Para P2 (arriba y rotado), la zona visual de HUD también se extenderá hacia abajo, así que tomamos rect.bottom.
        py = card.owner === 'p1' ? rect.top : rect.bottom;
      }

      setDeckMenu({ pid: card.owner, x: px, y: py });
      return;
    }
  };

  const handleCardDoubleClick = (card: GameCard, event?: React.MouseEvent) => {
    if (isDragging.current) return;

    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (!zone) return;

    if (zone.includes("attackZone") || zone.includes("manaZone")) {
      toggleTapped(card.id);
    }

    if (zone.includes("shields")) {
      toggleFace(card.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    if (zone.includes("manaZone") || zone.includes("shields")) {
      e.preventDefault();
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
    }
  };

  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    moveCard(placementMenu.card.id, placementMenu.fromZone, toZone);
    setPlacementMenu(null);
  }, [placementMenu, moveCard]);

  const execDraw = (pid: PlayerId) => {
    const amt = drawAmt[pid] > 0 ? drawAmt[pid] : 1;
    drawCards(pid, amt);
    setDrawAmt(prev => ({ ...prev, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execMana = (pid: PlayerId) => {
    const amt = manaAmt[pid] > 0 ? manaAmt[pid] : 1;
    for (let i = 0; i < amt; i++) topToMana(pid);
    setManaAmt(prev => ({ ...prev, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execGrave = (pid: PlayerId) => {
    const amt = graveAmt[pid] > 0 ? graveAmt[pid] : 1;
    topToGraveyard(pid, amt);
    setGraveAmt(prev => ({ ...prev, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execShield = (pid: PlayerId) => {
    const amt = shieldAmt[pid] > 0 ? shieldAmt[pid] : 1;
    for (let i = 0; i < amt; i++) topToShield(pid);
    setShieldAmt(prev => ({ ...prev, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execLook = (pid: PlayerId) => {
    const amt = lookAmt[pid] > 0 ? lookAmt[pid] : 1;
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "private", amount: amt });
    setDeckMenu(null);
    setLookAmt(p => ({ ...p, [pid]: 0 }));
  };
  const execReveal = (pid: PlayerId) => {
    const amt = revealAmt[pid] > 0 ? revealAmt[pid] : 1;
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "reveal", amount: amt });
    setDeckMenu(null);
    setRevealAmt(p => ({ ...p, [pid]: 0 }));
  };

  const numInputCls = "w-9 bg-black/40 text-center text-white text-[9px] font-black outline-none border-x border-white/5 focus:bg-blue-900/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  const renderHUDZone = (key: string, pid: PlayerId, f: boolean) => {
    const labels: Record<string, string> = { hyperspatial: 'HS', mainDeck: 'DECK', cemetery: 'GY', banishZone: 'ABBYS', gZone: 'G' };
    const zoneKey = (key === 'mainDeck' ? `${pid}_mainDeck` : `${pid}_${key}`) as ZoneName;
    const topCardId = zones[zoneKey].length > 0 ? zones[zoneKey][zones[zoneKey].length - 1] : null;
    const isPublic = ['cemetery', 'hyperspatial', 'banishZone', 'gZone'].includes(key);
    const rot = f ? "rotate-180" : "";

    return (
      <DroppableZone
        key={key}
        id={zoneKey}
        title=""
        compact
        label={labels[key]}
        count={zones[zoneKey].length}
        onView={isPublic ? () => setViewingZone({ zone: zoneKey, mode: "full", specificCardIds: undefined }) : undefined}
      >
        {topCardId && (
          <div className={cn("absolute inset-0 p-1", rot)}>
            <Card
              card={isPublic ? { ...cards[topCardId], face: 'up' } : cards[topCardId]}
              zone={zoneKey}
              onHover={(c) => handleCardHover(c, zoneKey)}
              onLeave={() => handleCardHover(null)}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
            />
          </div>
        )}
      </DroppableZone>
    );
  };

  // ─── Per-player board (Sharp Dividers 60/40) ───────────────────────────────
  const renderBoard = (pid: PlayerId, flipped: boolean) => {
    const f = flipped;
    const rot = f ? "rotate-180" : "";

    return (
      <div className={cn("grid grid-rows-[60%_40%] h-[50vh] w-full relative z-10 overflow-hidden", rot)}>

        {/* ── Battle Zone (60%) ── */}
        <div
          className="relative h-full border-b border-[#00f2ff]/20 backdrop-blur-[16px] overflow-hidden"
          style={{
            backgroundColor: 'rgba(60, 30, 30, 0.18)',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.05) 0%, transparent 70%)'
          }}
          onMouseEnter={() => setIsBattleHovered(true)}
          onMouseLeave={() => setIsBattleHovered(false)}
        >
          <DroppableZone
            id={`${pid}_attackZone`}
            title=""
            label="BATTLE ZONE"
            className="w-full h-full"
            count={zones[`${pid}_attackZone`].length}
          >
            <div className="flex flex-wrap justify-center content-center items-center p-4 gap-3 w-full h-full overflow-y-auto custom-scrollbar relative">
              {zones[`${pid}_attackZone`].map(id => {
                const c = cards[id];
                const hasPos = c.boardX != null && c.boardY != null;
                return (
                  <div key={id}
                    className={cn("shrink-0 w-16 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:z-50", rot, hasPos ? "absolute" : "relative")}
                    style={hasPos ? { left: c.boardX as number, top: c.boardY as number, margin: 0 } : {}}>
                    <Card
                      card={c}
                      zone={`${pid}_attackZone` as ZoneName}
                      onHover={(cardEvt) => handleCardHover(cardEvt, `${pid}_attackZone` as ZoneName)}
                      onLeave={() => handleCardHover(null)}
                      onClick={handleCardClick}
                      onDoubleClick={handleCardDoubleClick}
                    />
                  </div>
                )
              })}
            </div>
          </DroppableZone>
        </div>

        {/* ── Fila de Recursos (40%) ── */}
        <div className="flex relative h-full overflow-visible">

          {/* Mana Zone (Izquierda 50%) */}
          <DroppableZone
            id={`${pid}_manaZone`}
            title=""
            label="MANA ZONE"
            className="flex-1 min-w-0 border-r border-[#00ff88]/20 overflow-visible relative backdrop-blur-[16px]"
            style={{
              backgroundColor: 'rgba(20, 50, 40, 0.35)',
              backgroundImage: 'radial-gradient(circle at 0% 100%, rgba(0, 255, 136, 0.08) 0%, transparent 60%)',
              borderTop: f ? 'none' : '1px solid rgba(0, 255, 136, 0.2)',
              borderBottom: f ? '1px solid rgba(0, 255, 136, 0.2)' : 'none'
            }}
            count={zones[`${pid}_manaZone`].length}
            manaCards={zones[`${pid}_manaZone`]}
            cardsData={cards}
          >
            <div className="absolute inset-0 z-10 flex flex-wrap content-start items-start justify-start px-6 pt-2 pb-2 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300">
              {zones[`${pid}_manaZone`].map((id) => {
                const c = cards[id];
                return (
                  <div
                    key={id}
                    onContextMenu={e => handleContextMenu(e, c, `${pid}_manaZone` as ZoneName)}
                    className={cn(
                      "shrink-0 w-12 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-50 hover:-translate-y-1 group",
                      rot,
                      "relative"
                    )}
                  >
                    <Card
                      card={c}
                      zone={`${pid}_manaZone` as ZoneName}
                      onHover={(cardEvt) => handleCardHover(cardEvt, `${pid}_manaZone` as ZoneName)}
                      onLeave={() => handleCardHover(null)}
                      onClick={handleCardClick}
                      onDoubleClick={handleCardDoubleClick}
                    />
                  </div>
                );
              })}
            </div>
          </DroppableZone>

          {/* Shield Zone (Derecha 50%) */}
          <DroppableZone
            id={`${pid}_shields`}
            title=""
            label="SHIELD ZONE"
            className="flex-1 min-w-0 relative overflow-visible backdrop-blur-[16px]"
            style={{
              backgroundColor: 'rgba(60, 50, 20, 0.35)',
              backgroundImage: 'radial-gradient(circle at 100% 100%, rgba(255, 204, 0, 0.08) 0%, transparent 60%)',
              borderTop: f ? 'none' : '1px solid rgba(255, 204, 0, 0.2)',
              borderBottom: f ? '1px solid rgba(255, 204, 0, 0.2)' : 'none'
            }}
            count={zones[`${pid}_shields`].length}
          >
            <div className="absolute inset-0 z-10 flex flex-wrap content-start items-start justify-start px-6 pt-2 pb-2 gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300">
              {zones[`${pid}_shields`].map((id, index) => {
                const c = cards[id];
                const isBroken = viewingZone?.zone === `${pid}_shields` && viewingZone?.mode === 'private' && viewingZone?.specificCardIds?.includes(id);

                return (
                  <div
                    key={id}
                    onContextMenu={e => handleContextMenu(e, c, `${pid}_shields` as ZoneName)}
                    className={cn(
                      "shrink-0 w-12 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:z-50 hover:-translate-y-1 group",
                      rot,
                      "relative"
                    )}
                  >
                    <Card
                      card={c}
                      zone={`${pid}_shields` as ZoneName}
                      shieldNumber={index + 1}
                      onHover={(cardEvt) => handleCardHover(cardEvt, `${pid}_shields` as ZoneName)}
                      onLeave={() => handleCardHover(null)}
                      onClick={handleCardClick}
                      onDoubleClick={handleCardDoubleClick}
                    />
                    {isBroken && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/40 rounded shadow-inner">
                        <span className="text-[7px] font-black text-white bg-red-600/90 px-1.5 py-0.5 rounded shadow-lg border border-red-400/50 uppercase tracking-widest -rotate-[15deg] backdrop-blur-sm drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">
                          Broken

                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DroppableZone>
        </div>

        {/* Extra Decks Row (Submerged, Edge Left) */}
        <div className="absolute bottom-0 left-4 flex gap-1.5 z-[900] pointer-events-none">
          {['hyperspatial', 'gZone'].map(key => (
            <div
              key={key}
              className="pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] translate-y-[55%] hover:-translate-y-[calc(-55%+4px)] hover:scale-105 hover:z-[950] opacity-100 drop-shadow-2xl"
            >
              {renderHUDZone(key, pid, f)}
            </div>
          ))}
        </div>

        {/* Main Flow Row (Submerged, Edge Right) */}
        <div className="absolute bottom-0 right-4 flex gap-1.5 z-[900] pointer-events-none">
          {['mainDeck', 'cemetery', 'banishZone'].map(key => (
            <div
              key={key}
              className="pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] translate-y-[55%] hover:-translate-y-[calc(-55%+4px)] hover:scale-105 hover:z-[950] opacity-100 drop-shadow-2xl"
            >
              {renderHUDZone(key, pid, f)}
            </div>
          ))}
        </div>

      </div>
    );
  };

  const renderHandOverlay = (pid: PlayerId, flipped: boolean) => {
    const f = flipped;
    const rot = f ? "rotate-180" : "";
    const isMenuOpenForHand = placementMenu?.fromZone === `${pid}_hand`;

    return (
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center pointer-events-none transition-all duration-300 ease-out overflow-visible",
          f ? "top-4 rotate-180" : "bottom-4",
          (!hoveredHand || hoveredHand !== pid) && activeCard?.owner !== pid && !isMenuOpenForHand
            ? (f ? "-translate-y-1/2 opacity-100 scale-95" : "translate-y-1/2 opacity-100 scale-95")
            : (f ? "-translate-y-[20%] opacity-100 scale-100" : "translate-y-[20%] opacity-100 scale-100")
        )}
        style={{ height: '140px' }}
      >
        <DroppableZone id={`${pid}_hand`} title="" className="min-w-[120px] w-max px-4 h-full bg-transparent pointer-events-auto transition-all duration-300" invisible count={zones[`${pid}_hand`].length}>
          <div className="flex items-end justify-center w-max h-full px-2 pb-2 pointer-events-none">
            {zones[`${pid}_hand`].map((id, idx) => (
              <div
                key={id}
                onMouseEnter={() => setHoveredHand(pid)}
                onMouseLeave={() => setHoveredHand(null)}
                className={cn(
                  "relative transition-all duration-200 hover:-translate-y-6 hover:scale-110 hover:z-[510] w-14 group cursor-pointer pointer-events-auto",
                  idx > 0 ? "-ml-6" : "",
                  placementMenu?.card.id === id ? "ring-2 ring-blue-500/50 -translate-y-4" : ""
                )}
              >
                <div className={rot}>
                  <Card
                    card={cards[id]}
                    zone={`${pid}_hand`}
                    onHover={(c) => handleCardHover(c, `${pid}_hand` as ZoneName)}
                    onLeave={() => handleCardHover(null)}
                    onClick={handleCardClick}
                    onDoubleClick={handleCardDoubleClick}
                  />
                </div>
              </div>
            ))}
          </div>
        </DroppableZone>
      </div>
    );
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

        {/* NOTIFICATIONS */}
        {notification && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 fade-in duration-500">
            <div className={cn(
              "px-8 py-3.5 rounded-2xl border shadow-4xl backdrop-blur-2xl flex items-center gap-4 transition-all scale-100 hover:scale-105",
              notification.type === 'error' ? "bg-red-950/80 border-red-500/40 text-red-100 shadow-red-900/20" : "bg-blue-950/80 border-blue-500/40 text-blue-100 shadow-blue-900/20"
            )}>
              <div className={cn("w-2.5 h-2.5 rounded-full", notification.type === 'error' ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]")} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] leading-none mb-1">{notification.type === 'error' ? 'Action Denied' : 'Information'}</span>
                <span className="text-[9px] font-bold text-white/70 tracking-wider low-case">{notification.msg}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Hover Preview (Gigantography) ── */}
        {previewCard && (
          <div
            className="fixed right-5 top-1/2 -translate-y-1/2 z-[950] pointer-events-none flex flex-col drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
            style={{ width: '320px', maxWidth: '45vw' }}
          >
            <div className="w-full aspect-[3/4] overflow-hidden rounded-t-lg bg-black/60 shadow-inner">
              <Card card={{ ...previewCard, position: "vertical" }} isOverlay isStatic />
            </div>

            <div className="bg-[#05070a]/98 backdrop-blur-xl p-4 rounded-b-lg border-t border-white/5 shadow-2xl">
              <div className="max-h-[20vh] overflow-y-auto custom-scrollbar-invisible">
                <p className="text-[12px] text-white/80 leading-relaxed font-medium selection:bg-blue-500/30 whitespace-pre-wrap">
                  {previewCard.face === 'down' ? '???\n\nSecret Card' : previewCard.description}
                </p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 h-screen flex flex-col relative overflow-hidden bg-[#0a0d14]">
          {renderBoard("p2", true)}

          {/* Battle Line (Frontera de Energía Neón) */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,1),_0_0_5px_rgba(255,255,255,0.8)] z-5 pointer-events-none select-none opacity-100" />

          {/* Phase HUD */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none w-full flex justify-center">
            <div className={cn(
              "flex items-center backdrop-blur-[12px] p-0.5 px-3 rounded-full pointer-events-auto h-8 transition-all duration-500 scale-95 origin-center",
              currentPlayer === "p1"
                ? "bg-[#0f172a]/90 border border-blue-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_15px_rgba(59,130,246,0.15)]"
                : "bg-[#1a0f0f]/90 border border-red-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_15px_rgba(239,68,68,0.15)]"
            )}>
              <div className={cn(
                "px-3 h-5 rounded-full flex items-center gap-2 mr-3 shadow-inner",
                currentPlayer === "p1"
                  ? "bg-blue-500/20 border border-blue-400/30 text-blue-400"
                  : "bg-red-500/20 border border-red-400/30 text-red-400"
              )}>
                <div className={cn("w-1 h-1 rounded-full animate-pulse", currentPlayer === "p1" ? "bg-blue-400 shadow-[0_0_8px_#60a5fa]" : "bg-red-400 shadow-[0_0_8px_#f87171]")} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{currentPlayer}</span>
              </div>
              <div className="flex items-center gap-2.5 px-2">
                {PHASES.map((phase) => (
                  <span key={phase} className={cn("text-[8px] font-bold uppercase tracking-widest", currentPhase === phase ? "text-white opacity-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" : "text-slate-500 opacity-40")}>{phase}</span>
                ))}
              </div>
              <button
                onClick={nextPhase}
                className={cn(
                  "ml-3 pl-4 pr-2 h-5 border-l border-white/10 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] group transition-all",
                  currentPlayer === "p1" ? "text-blue-400/70 hover:text-blue-400" : "text-red-400/70 hover:text-red-400"
                )}
              >
                <span className={cn(currentPlayer === "p1" ? "drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" : "drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]")}>Next Step</span>
                <div className={cn("p-0.5 rounded-md transition-all", currentPlayer === "p1" ? "bg-blue-500/10 group-hover:bg-blue-500/20" : "bg-red-500/10 group-hover:bg-red-500/20")}>
                  <SkipForward size={10} className={currentPlayer === "p1" ? "text-blue-400" : "text-red-400"} />
                </div>
              </button>
            </div>
          </div>

          {renderBoard("p1", false)}
          {renderHandOverlay("p2", true)}
          {renderHandOverlay("p1", false)}
        </main>

        <DragOverlay dropAnimation={{ duration: 150 }} zIndex={1000}>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        {contextMenu && (
          <div
            className="fixed z-[1300] bg-[#090c12]/98 backdrop-blur-xl border border-white/10 p-0 shadow-4xl min-w-[150px]"
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
                  onClick={() => {
                    setViewingZone(prev => {
                      if (prev?.mode === "private" && prev.zone === contextMenu.zone) {
                        if (prev.specificCardIds && !prev.specificCardIds.includes(contextMenu.card.id)) {
                          return { ...prev, specificCardIds: [...prev.specificCardIds, contextMenu.card.id] };
                        }
                        return prev;
                      }
                      return { zone: contextMenu.zone, mode: "private", specificCardIds: [contextMenu.card.id] };
                    });
                    setContextMenu(null);
                  }}
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
        )}

        {placementMenu && (() => {
          const currentCard = cards[placementMenu.card.id];
          if (!currentCard) return null;

          return (
            <div
              ref={menuRef}
              className="fixed z-[1300] bg-black/90 backdrop-blur-md border border-white/5 shadow-3xl min-w-[140px]"
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

                {(placementMenu.fromZone.includes('shields') && !placementMenu.isFromViewingZone) && (
                  <>
                    <button onClick={() => {
                      setViewingZone(prev => {
                        if (prev?.mode === "private" && prev.zone === placementMenu.fromZone) {
                          if (prev.specificCardIds && !prev.specificCardIds.includes(currentCard.id)) {
                            return { ...prev, specificCardIds: [...prev.specificCardIds, currentCard.id] };
                          }
                          return prev;
                        }
                        return { zone: placementMenu.fromZone, mode: "private", specificCardIds: [currentCard.id] };
                      });
                      setPlacementMenu(null);
                    }} className="w-full px-4 py-3 hover:bg-amber-600/10 text-amber-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Break (View)</button>
                    <button onClick={() => {
                      toggleFace(currentCard.id);
                      setPlacementMenu(null);
                    }} className="w-full px-4 py-3 hover:bg-amber-600/10 text-amber-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Reveal / Hide</button>
                  </>
                )}

                {(placementMenu.fromZone.includes('shields') && placementMenu.isFromViewingZone) && (
                  <button onClick={() => {
                    toggleFace(currentCard.id);
                    setPlacementMenu(null);
                  }} className="w-full px-4 py-3 hover:bg-amber-600/10 text-amber-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Reveal / Hide</button>
                )}

                {(!placementMenu.fromZone.includes('attackZone') && !placementMenu.fromZone.includes('shields')) && (
                  <button onClick={() => handlePlaceCard(`${currentCard.owner}_attackZone` as ZoneName)} className="w-full px-4 py-3 hover:bg-blue-900/40 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Play to Battle Zone</button>
                )}

                {/* ADD EXLife functionality */}
                {placementMenu.fromZone.includes('attackZone') && (() => {
                  const execExLife = (e?: React.MouseEvent | React.KeyboardEvent) => {
                    if (e) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                    const amt = exLifeAmt[currentCard.owner] || 1;
                    for (let i = 0; i < amt; i++) {
                      const deck = useGameStore.getState().zones[`${currentCard.owner}_mainDeck`];
                      if (deck.length > 0) {
                        linkCard(deck[0], currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName);
                      } else {
                        showNotification("No more cards in deck!");
                        break;
                      }
                    }
                    setPlacementMenu(null);
                  };

                  return (
                    <div
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-orange-600/10 cursor-pointer transition-all border-b border-white/5 focus:outline-none focus:bg-orange-600/20"
                      onClick={execExLife}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") execExLife(e); }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pointer-events-none">
                        <ShieldCheck size={10} className="text-orange-500/60 shrink-0" />
                        <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest truncate">Add EXLife</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
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
                      </div>
                    </div>
                  );
                })()}

                {/* EXLife Menu */}
                {currentCard.linkedCardIds && currentCard.linkedCardIds.length > 0 && (
                  <div className="relative group">
                    <button className="w-full px-4 py-3 hover:bg-orange-900/40 text-orange-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center justify-between border-b border-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={10} className="text-orange-400" /> Unlink EXLife ({currentCard.linkedCardIds.length})
                      </div>
                      <span className="text-[14px] leading-none mb-0.5 ml-4">›</span>
                    </button>

                    {/* SUBMENU DESTINATIONS (English) */}
                    <div className="absolute left-[98%] top-0 ml-1 hidden group-hover:flex flex-col bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl min-w-[200px] z-[1130] max-h-[350px] overflow-visible custom-scrollbar-thin">
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                        <span className="text-[7px] text-white/40 font-black tracking-[0.2em] uppercase">Unlink All EXLife</span>
                      </div>
                      <button onClick={() => { currentCard.linkedCardIds?.forEach(cid => unlinkCard(cid, currentCard.id, `${currentCard.owner}_hand` as ZoneName)); setPlacementMenu(null); }} className="w-full px-4 py-2 hover:bg-blue-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Hand</button>
                      <button onClick={() => { currentCard.linkedCardIds?.forEach(cid => unlinkCard(cid, currentCard.id, `${currentCard.owner}_cemetery` as ZoneName)); setPlacementMenu(null); }} className="w-full px-4 py-2 hover:bg-red-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Cemetery</button>
                      <button onClick={() => { currentCard.linkedCardIds?.forEach(cid => unlinkCard(cid, currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName, 0)); setPlacementMenu(null); }} className="w-full px-4 py-2 hover:bg-indigo-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Deck Top</button>
                      <button onClick={() => { currentCard.linkedCardIds?.forEach(cid => unlinkCard(cid, currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName)); setPlacementMenu(null); }} className="w-full px-4 py-2 hover:bg-indigo-500/20 text-white text-[8px] font-black text-left uppercase tracking-wider flex items-center gap-2 border-b border-white/5">To Deck Bottom</button>

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

                            {/* THIRD LEVEL - Individual Targets */}
                            <div className="absolute left-[98%] top-[-1px] ml-1.5 hidden group-hover/lcard:flex flex-col bg-[#0b0f17] border border-white/10 shadow-huge min-w-[130px] z-[1140] rounded-sm divide-y divide-white/5">
                              <button onClick={() => { unlinkCard(cid, currentCard.id, `${currentCard.owner}_hand` as ZoneName); if (currentCard.linkedCardIds?.length === 1) setPlacementMenu(null); }} className="w-full px-3 py-2.5 hover:bg-blue-600/20 text-[7px] text-blue-100 font-black text-left uppercase tracking-widest">Hand</button>
                              <button onClick={() => { unlinkCard(cid, currentCard.id, `${currentCard.owner}_cemetery` as ZoneName); if (currentCard.linkedCardIds?.length === 1) setPlacementMenu(null); }} className="w-full px-3 py-2.5 hover:bg-red-600/20 text-[7px] text-red-100 font-black text-left uppercase tracking-widest">Grave</button>
                              <button onClick={() => { unlinkCard(cid, currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName, 0); if (currentCard.linkedCardIds?.length === 1) setPlacementMenu(null); }} className="w-full px-3 py-2.5 hover:bg-indigo-600/20 text-[7px] text-indigo-100 font-black text-left uppercase tracking-widest">Top Deck</button>
                              <button onClick={() => { unlinkCard(cid, currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName); if (currentCard.linkedCardIds?.length === 1) setPlacementMenu(null); }} className="w-full px-3 py-2.5 hover:bg-indigo-900/40 text-[7px] text-indigo-200 font-black text-left uppercase tracking-widest">Bottom Deck</button>
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

                  {/* SUBMENU */}
                  <div className="absolute left-[98%] bottom-0 ml-1 hidden group-hover:flex flex-col bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl min-w-[150px] z-[1120] max-h-[200px] overflow-y-auto overscroll-contain custom-scrollbar-thin">
                    <button onClick={() => handlePlaceCard(`${currentCard.owner}_hand` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-gray-400" /> To Hand</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_mainDeck` as ZoneName, 0); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> To Top Deck</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_mainDeck` as ZoneName); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-700" /> To Bottom Deck</button>
                    <button onClick={() => handlePlaceCard(`${currentCard.owner}_manaZone` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> To Mana</button>
                    <button onClick={() => handlePlaceCard(`${currentCard.owner}_shields` as ZoneName)} className="w-full px-4 py-3 hover:bg-white/5 text-white text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Set Shield</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_cemetery` as ZoneName); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-red-900/40 text-red-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> To GY (Grave)</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_hyperspatial` as ZoneName); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-blue-900/40 text-blue-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> To Hyper</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_gZone` as ZoneName); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-purple-900/40 text-purple-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3 border-b border-white/5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> To G Zone</button>
                    <button onClick={() => { moveCard(currentCard.id, placementMenu.fromZone, `${currentCard.owner}_banishZone` as ZoneName); setPlacementMenu(null); }} className="w-full px-4 py-3 hover:bg-red-900/40 text-red-100 text-[9px] font-black text-left uppercase tracking-widest flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-red-800" /> To Abyss</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {viewingZone && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[1200] flex items-end justify-center pointer-events-none">
            <div className="relative flex flex-col items-center min-w-[300px] min-h-[160px] max-w-[90vw] bg-[#090c12]/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto">
              <div className="flex gap-4 mb-3 w-full justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50">{viewingZone.mode === 'reveal' ? 'REVEALED' : viewingZone.zone.replace('_', ' ')}</span>
                <button onClick={() => setViewingZone(null)} className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 hover:bg-red-500/30 hover:text-red-300 px-3 py-1 rounded transition-colors"><X size={12} /></button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-2 pt-6 pb-2 items-start justify-center w-full custom-scrollbar-thin max-w-full">
                {zones[viewingZone.zone].length === 0 ? (
                  <div className="opacity-10 font-black text-2xl uppercase tracking-[0.5em] py-4 px-10">Empty</div>
                ) : (
                  (viewingZone.specificCardIds ? viewingZone.specificCardIds : zones[viewingZone.zone].slice(0, viewingZone.amount)).map(id => {
                    const originalIndex = zones[viewingZone.zone].indexOf(id);
                    return (
                      <div key={id} className="hover:scale-105 hover:-translate-y-2 transition-all duration-300 shrink-0 w-14 md:w-16 drop-shadow-xl cursor-pointer">
                        <Card
                          card={{
                            ...cards[id],
                            face: 'up',
                            position: 'vertical'
                          }}
                          shieldNumber={viewingZone.zone.includes('shields') ? originalIndex + 1 : undefined}
                          showShieldHud={viewingZone.zone.includes('shields')}
                          zone={viewingZone.zone}
                          onHover={handleCardHover}
                          onLeave={() => handleCardHover(null)}
                          onClick={(c, e) => handleCardClick(c, e, true)}
                          onDoubleClick={handleCardDoubleClick}
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {deckMenu && (
          <div
            ref={menuRef}
            className="fixed z-[1300] bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl w-48 flex flex-col p-0 animate-in fade-in slide-in-from-bottom-4 duration-400 max-h-[80vh] overflow-hidden"
            style={{
              left: deckMenu.x > window.innerWidth - 200 ? window.innerWidth - 210 : deckMenu.x - 96,
              top: deckMenu.pid === 'p1' ? undefined : deckMenu.y + 25,
              bottom: deckMenu.pid === 'p1' ? window.innerHeight - deckMenu.y + 25 : undefined,
            }}
          >
            <div className="px-3 py-2 flex justify-between items-center border-b border-white/10 bg-white/10">
              <span className="text-[9px] text-white font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Deck
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-sm tabular-nums text-white text-[10px] font-bold border border-white/5">{zones[`${deckMenu.pid}_mainDeck`].length}</span>
            </div>
            <div className="flex flex-col overflow-y-auto custom-scrollbar-thin pb-2">
              <div onClick={() => execDraw(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-600/10 group transition-all cursor-pointer">
                <ArrowDownCircle size={12} className="text-blue-500/60" /><span className="text-[8px] text-white font-black uppercase tracking-widest flex-1">Draw</span>
                <input type="number" value={drawAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setDrawAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execDraw(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execDraw(deckMenu.pid); }} className="text-[8px] text-blue-400 font-black px-2 ml-1">OK</button>
              </div>
              <div onClick={() => execMana(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-emerald-600/10 group transition-all cursor-pointer">
                <Droplet size={12} className="text-emerald-500/60" /><span className="text-[8px] text-white font-black uppercase tracking-widest flex-1">Mana X</span>
                <input type="number" value={manaAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setManaAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execMana(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execMana(deckMenu.pid); }} className="text-[8px] text-emerald-400 font-black px-2 ml-1">OK</button>
              </div>
              <div onClick={() => execShield(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-amber-600/10 group transition-all border-b border-white/5 cursor-pointer">
                <Shield size={12} className="text-amber-500/60" /><span className="text-[8px] text-white/80 font-black uppercase tracking-widest flex-1">Shield X</span>
                <input type="number" value={shieldAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setShieldAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execShield(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execShield(deckMenu.pid); }} className="text-[8px] text-amber-400 font-black px-2 ml-1">OK</button>
              </div>
              <button onClick={() => { shuffleDeck(deckMenu.pid); setDeckMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-[8px] text-white/40 font-black uppercase tracking-widest transition-all"><Shuffle size={12} /> Shuffle Deck</button>
              <div onClick={() => execLook(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-600/10 group transition-all border-t border-white/5 cursor-pointer">
                <Search size={12} className="text-blue-500/60" /><span className="text-[8px] text-blue-400/80 font-black uppercase tracking-widest flex-1">Look X</span>
                <input type="number" value={lookAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setLookAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execLook(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execLook(deckMenu.pid); }} className="text-[8px] text-blue-400 font-black px-2 ml-1">OK</button>
              </div>
              <div onClick={() => execReveal(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-orange-600/10 group transition-all cursor-pointer">
                <Eye size={12} className="text-orange-500/60" /><span className="text-[8px] text-orange-400/80 font-black uppercase tracking-widest flex-1">Reveal X</span>
                <input type="number" value={revealAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setRevealAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execReveal(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execReveal(deckMenu.pid); }} className="text-[8px] text-orange-400 font-black px-2 ml-1">OK</button>
              </div>
              <div onClick={() => execGrave(deckMenu.pid)} className="flex items-center gap-2 px-3 py-2 hover:bg-red-600/10 group transition-all border-t border-white/5 cursor-pointer">
                <X size={12} className="text-red-500/60" /><span className="text-[8px] text-red-500/80 font-black uppercase tracking-widest flex-1">To Grave</span>
                <input type="number" value={graveAmt[deckMenu.pid] || ""} onClick={e => e.stopPropagation()} onChange={e => setGraveAmt(p => ({ ...p, [deckMenu.pid]: parseInt(e.target.value) || 0 }))} onKeyDown={e => { if (e.key === "Enter") execGrave(deckMenu.pid); }} className={cn(numInputCls, "w-8 h-5 text-[9px]")} />
                <button onClick={e => { e.stopPropagation(); execGrave(deckMenu.pid); }} className="text-[8px] text-red-400 font-black px-2 ml-1">OK</button>
              </div>

              <button onClick={() => { setViewingZone({ zone: `${deckMenu.pid}_mainDeck` as ZoneName, mode: "full" }); setDeckMenu(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-[8px] text-white/40 font-black uppercase tracking-widest transition-all border-t border-white/5"><Eye size={12} /> View All</button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
