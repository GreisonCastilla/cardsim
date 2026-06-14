"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { DndContext, DragOverlay, pointerWithin, MeasuringStrategy, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { useGameStore, GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { Card } from "./Card";
import { cn } from "../lib/utils";

import { PhaseHud } from "./PhaseHud";
import { NotificationSystem, NotificationState } from "./NotificationSystem";
import { CardPreview } from "./CardPreview";
import { PlayerSection } from "./PlayerSection";
import { HandOverlay } from "./HandOverlay";
import { PlacementMenu } from "./PlacementMenu";
import { ContextMenu } from "./ContextMenu";
import { DeckMenu } from "./DeckMenu";
import { ViewModal } from "./ViewModal";

import { useGameDnD } from "../lib/useGameDnD";

// ─── Types ──────────────────────────────────────────────────────────────────
interface GameAction {
  actionType: string;
  [key: string]: any;
}

interface ActionFeedEntry {
  id: number;
  text: string;
}

interface MultiplayerGameBoardProps {
  ws: WebSocket;
  myRole: PlayerId;
  myDeckCards: GameCard[];
  opponentDeckCards: GameCard[];
  opponentName: string;
  myName: string;
  onExit: () => void;
}

// ─── Module-level helpers ────────────────────────────────────────────────────
// These live outside React so they never cause stale-closures.

let feedCounter = 0;

function sendWsAction(ws: WebSocket, action: GameAction) {
  if (ws.readyState === WebSocket.OPEN) {
    // Send the action to the other player via GAME_ACTION relay
    ws.send(JSON.stringify({ type: "GAME_ACTION", payload: action }));

    // Persist full state to the server cache (for page-reload recovery)
    // using STATE_CACHE — this is NOT relayed to the opponent.
    if (
      action.actionType !== "CURSOR_MOVE" &&
      action.actionType !== "FULL_SYNC" &&
      action.actionType !== "REQUEST_SYNC" &&
      action.actionType !== "SURRENDER"
    ) {
      // Use a small delay to let Zustand commit the state update
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const state = useGameStore.getState();
        ws.send(
          JSON.stringify({
            type: "STATE_CACHE",
            payload: {
              zones: state.zones,
              cards: state.cards,
              currentPlayer: state.currentPlayer,
              currentPhase: state.currentPhase,
            },
          })
        );
      }, 50);
    }
  }
}

function describAction(action: GameAction, opponentName: string): string | null {
  switch (action.actionType) {
    case "MOVE_CARD":        return `${opponentName} movió una carta`;
    case "DRAW_CARDS":       return `${opponentName} robó ${action.amount} carta(s)`;
    case "SHUFFLE_DECK":     return `${opponentName} barajó su mazo`;
    case "TOGGLE_TAPPED":    return `${opponentName} giró/desgiró una carta`;
    case "TOGGLE_FACE":      return `${opponentName} volteó una carta`;
    case "NEXT_PHASE":       return `${opponentName} avanzó la fase`;
    case "TOP_TO_MANA":      return `${opponentName} cargó maná`;
    case "TOP_TO_SHIELD":    return `${opponentName} colocó escudo`;
    case "TOP_TO_GRAVEYARD": return `${opponentName} mandó ${action.amount} al cementerio`;
    case "UNTAP_ALL":        return `${opponentName} desgiró todo`;
    case "LINK_CARD":        return `${opponentName} enlazó EX Life`;
    case "UNLINK_CARD":      return `${opponentName} desenlazó EX Life`;
    default:                 return null;
  }
}

/**
 * Apply a remote game action directly to the Zustand store.
 * Uses useGameStore.getState() — the canonical Zustand way to call actions
 * from imperative/async code without stale closures or subscriptions.
 */
function applyRemoteAction(action: GameAction) {
  // Always get the freshest store snapshot imperatively — no refs needed.
  const store = useGameStore.getState();

  switch (action.actionType) {
    case "ZONE_SYNC":
      if (action.zones) store.applyRemoteZones(action.zones);
      break;
    case "MOVE_CARD":
      store.moveCard(action.cardId, action.fromZone, action.toZone, action.newIndex, action.boardX, action.boardY);
      break;
    case "DRAW_CARDS":
      store.drawCards(action.playerId, action.amount);
      break;
    case "SHUFFLE_DECK":
      store.shuffleDeck(action.playerId, action.newOrder);
      break;
    case "TOGGLE_TAPPED":
      store.toggleTapped(action.cardId);
      break;
    case "TOGGLE_FACE":
      store.toggleFace(action.cardId);
      break;
    case "NEXT_PHASE":
      if (action.phase && action.player) {
        store.applyRemotePhase(action.phase, action.player);
      } else {
        store.nextPhase();
      }
      break;
    case "TOP_TO_MANA":
      store.topToMana(action.playerId);
      break;
    case "TOP_TO_SHIELD":
      store.topToShield(action.playerId);
      break;
    case "TOP_TO_GRAVEYARD":
      store.topToGraveyard(action.playerId, action.amount);
      break;
    case "UNTAP_ALL":
      store.untapAll(action.playerId);
      break;
    case "LINK_CARD":
      store.linkCard(action.childId, action.parentId, action.fromZone);
      break;
    case "UNLINK_CARD":
      store.unlinkCard(action.childId, action.parentId, action.toZone, action.newIndex);
      break;
    case "FULL_SYNC":
      if (action.zones && action.cards) {
        store.applyFullSync(action.zones, action.cards, action.currentPlayer, action.currentPhase);
      }
      break;
    case "REQUEST_SYNC":
      if (store.myRole === "p1") {
        // P2 requested a sync — send the full state as FULL_SYNC via GAME_ACTION
        const ws = (window as any)._cardsim_ws;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "GAME_ACTION",
            payload: {
              actionType: "FULL_SYNC",
              zones: store.zones,
              cards: store.cards,
              currentPlayer: store.currentPlayer,
              currentPhase: store.currentPhase,
            },
          }));
        }
      }
      break;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function MultiplayerGameBoard({
  ws,
  myRole,
  myDeckCards,
  opponentDeckCards,
  opponentName,
  myName,
  onExit,
}: MultiplayerGameBoardProps) {
  // ── Reactive Zustand subscriptions (drive re-renders) ──────────────────────
  // Each selector is granular so the component only re-renders for relevant changes.
  const cards         = useGameStore((s) => s.cards);
  const zones         = useGameStore((s) => s.zones);
  const currentPhase  = useGameStore((s) => s.currentPhase);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  // ── Non-reactive Zustand actions (called imperatively, never cause re-renders) ─
  // These are stable references created once inside create() and never change.
  const initializeGameFromDecks = useGameStore((s) => s.initializeGameFromDecks);
  const moveCard       = useGameStore((s) => s.moveCard);
  const drawCards      = useGameStore((s) => s.drawCards);
  const shuffleDeck    = useGameStore((s) => s.shuffleDeck);
  const toggleTapped   = useGameStore((s) => s.toggleTapped);
  const toggleFace     = useGameStore((s) => s.toggleFace);
  const nextPhase      = useGameStore((s) => s.nextPhase);
  const topToMana      = useGameStore((s) => s.topToMana);
  const topToShield    = useGameStore((s) => s.topToShield);
  const topToGraveyard = useGameStore((s) => s.topToGraveyard);
  const untapAll       = useGameStore((s) => s.untapAll);
  const linkCard       = useGameStore((s) => s.linkCard);
  const unlinkCard     = useGameStore((s) => s.unlinkCard);

  const opponentRole: PlayerId = myRole === "p1" ? "p2" : "p1";
  const isMyTurn = currentPlayer === myRole;

  // ── Local UI state ────────────────────────────────────────────────────────
  const [mounted, setMounted]             = useState(false);
  const [activeCard, setActiveCard]       = useState<GameCard | null>(null);
  const [previewCard, setPreviewCard]     = useState<GameCard | null>(null);
  const [viewingZone, setViewingZone]     = useState<any>(null);
  const [contextMenu, setContextMenu]     = useState<any>(null);
  const [placementMenu, setPlacementMenu] = useState<any>(null);
  const [hoveredHand, setHoveredHand]     = useState<PlayerId | null>(null);
  const [isBattleHovered, setIsBattleHovered] = useState(false);
  const [deckMenu, setDeckMenu]           = useState<any>(null);
  const [notification, setNotification]   = useState<NotificationState | null>(null);
  const [actionFeed, setActionFeed]       = useState<ActionFeedEntry[]>([]);
  const [opponentCursor, setOpponentCursor] = useState<{ x: number; y: number; activeCardId: string | null } | null>(null);

  const [drawAmt, setDrawAmt]   = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [manaAmt, setManaAmt]   = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [graveAmt, setGraveAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [lookAmt, setLookAmt]   = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [revealAmt, setRevealAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [shieldAmt, setShieldAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [exLifeAmt, setExLifeAmt] = useState<Record<PlayerId, number>>({ p1: 1, p2: 1 });

  const menuRef      = useRef<HTMLDivElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification helpers ──────────────────────────────────────────────────
  const showNotification = useCallback((msg: string, type: "error" | "info" = "error") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const pushActionFeed = useCallback((text: string) => {
    const entry: ActionFeedEntry = { id: ++feedCounter, text };
    setActionFeed((prev) => [...prev.slice(-7), entry]);
    setTimeout(() => {
      setActionFeed((prev) => prev.filter((e) => e.id !== entry.id));
    }, 4000);
  }, []);

  // ── Initialize game + send zone sync ──────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    
    // Store ws globally so applyRemoteAction can use it for REQUEST_SYNC
    (window as any)._cardsim_ws = ws;

    // Check if state was already restored from server (page reload scenario)
    const restoredFlag = (window as any).__cardsim_state_restored;
    if (restoredFlag) {
      // State was already applied from GAME_STATE_RESTORE — skip re-initialization.
      // Just cache the current state on the server.
      delete (window as any).__cardsim_state_restored;
      const state = useGameStore.getState();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "STATE_CACHE",
          payload: {
            zones: state.zones,
            cards: state.cards,
            currentPlayer: state.currentPlayer,
            currentPhase: state.currentPhase,
          },
        }));
      }
      return;
    }

    // Normal first load: initialize the game from deck cards
    initializeGameFromDecks(myDeckCards, opponentDeckCards, myRole);

    // Delay slightly so the store commits the initialization before we read it.
    const timer = setTimeout(() => {
      const state = useGameStore.getState();
      
      if (myRole === "p1") {
        // Host sends FULL_SYNC to Guest + caches on server
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "GAME_ACTION",
            payload: {
              actionType: "FULL_SYNC",
              zones: state.zones,
              cards: state.cards,
              currentPlayer: state.currentPlayer,
              currentPhase: state.currentPhase,
            },
          }));
          ws.send(JSON.stringify({
            type: "STATE_CACHE",
            payload: {
              zones: state.zones,
              cards: state.cards,
              currentPlayer: state.currentPlayer,
              currentPhase: state.currentPhase,
            },
          }));
        }
      } else {
        // Guest: request sync from Host in case we missed the initial FULL_SYNC
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "GAME_ACTION", payload: { actionType: "REQUEST_SYNC" } }));
        }
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Click-outside to close menus ──────────────────────────────────────────
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

  // ── WebSocket message listener ────────────────────────────────────────────
  // Deps = [ws] only. opponentName/callbacks accessed via stable refs below.
  const opponentNameRef  = useRef(opponentName);
  const pushFeedRef      = useRef(pushActionFeed);
  const showNotifRef     = useRef(showNotification);
  const setCursorRef     = useRef(setOpponentCursor);

  // Keep refs current after every render (no deps array = runs every render)
  useEffect(() => { opponentNameRef.current  = opponentName; });
  useEffect(() => { pushFeedRef.current      = pushActionFeed; });
  useEffect(() => { showNotifRef.current     = showNotification; });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "GAME_ACTION") {
        const action = msg.payload as GameAction;

        if (action.actionType === "CURSOR_MOVE") {
          // Cursor updates are UI-only; bypass the store entirely.
          setCursorRef.current({ x: action.x, y: action.y, activeCardId: action.activeCardId });
          return;
        }

        // Apply the action to the Zustand store imperatively.
        // This triggers reactive subscriptions above (cards/zones/etc.) → re-render.
        applyRemoteAction(action);

        // Show action in the feed (skip ZONE_SYNC — it's just initialization noise).
        if (action.actionType !== "ZONE_SYNC") {
          const desc = describAction(action, opponentNameRef.current);
          if (desc) pushFeedRef.current(desc);
        }
      } else if (msg.type === "GAME_STATE_RESTORE") {
        // Server sent cached state (from REJOIN_ROOM or JOIN_ROOM)
        const payload = msg.payload;
        if (payload && payload.zones && payload.cards) {
          console.log("[SYNC] Applying GAME_STATE_RESTORE from server");
          const store = useGameStore.getState();
          store.applyFullSync(payload.zones, payload.cards, payload.currentPlayer, payload.currentPhase);
        }
      } else if (msg.type === "OPPONENT_SURRENDERED") {
        showNotifRef.current(`${opponentNameRef.current} se ha rendido. ¡Ganaste!`, "info");
        alert(`${opponentNameRef.current} se ha rendido. ¡Ganaste!`);
        onExit();
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]); // Re-register only if the socket itself changes

  // ── Real-time cursor sync ──────────────────────────────────────────────────
  useEffect(() => {
    let lastSend = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastSend > 50) {
        lastSend = now;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        sendWsAction(ws, { actionType: "CURSOR_MOVE", x, y, activeCardId: activeCard?.id ?? null });
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [ws, activeCard]);

  // ── Wrapped actions (local + broadcast) ───────────────────────────────────
  const wrappedMoveCard = useCallback(
    (cardId: string, fromZone: ZoneName, toZone: ZoneName, newIndex?: number, boardX?: number | null, boardY?: number | null) => {
      moveCard(cardId, fromZone, toZone, newIndex, boardX, boardY);
      sendWsAction(ws, { actionType: "MOVE_CARD", cardId, fromZone, toZone, newIndex, boardX, boardY });
    },
    [moveCard, ws],
  );

  const wrappedDrawCards = useCallback(
    (playerId: PlayerId, amount: number) => {
      drawCards(playerId, amount);
      sendWsAction(ws, { actionType: "DRAW_CARDS", playerId, amount });
    },
    [drawCards, ws],
  );

  const wrappedShuffleDeck = useCallback(
    (playerId: PlayerId) => {
      shuffleDeck(playerId);
      // Wait for store to update then capture the new order to sync it
      const { zones: updatedZones } = useGameStore.getState();
      const newOrder = updatedZones[`${playerId}_mainDeck` as ZoneName];
      sendWsAction(ws, { actionType: "SHUFFLE_DECK", playerId, newOrder });
    },
    [shuffleDeck, ws],
  );

  const wrappedToggleTapped = useCallback(
    (cardId: string) => {
      toggleTapped(cardId);
      sendWsAction(ws, { actionType: "TOGGLE_TAPPED", cardId });
    },
    [toggleTapped, ws],
  );

  const wrappedToggleFace = useCallback(
    (cardId: string) => {
      toggleFace(cardId);
      sendWsAction(ws, { actionType: "TOGGLE_FACE", cardId });
    },
    [toggleFace, ws],
  );

  const wrappedNextPhase = useCallback(() => {
    nextPhase();
    
    // Capture the state AFTER the local update to send the exact result to the opponent
    const state = useGameStore.getState();
    sendWsAction(ws, { 
      actionType: "NEXT_PHASE", 
      phase: state.currentPhase, 
      player: state.currentPlayer 
    });
  }, [nextPhase, ws]);

  const wrappedTopToMana = useCallback(
    (playerId: PlayerId) => {
      topToMana(playerId);
      sendWsAction(ws, { actionType: "TOP_TO_MANA", playerId });
    },
    [topToMana, ws],
  );

  const wrappedTopToShield = useCallback(
    (playerId: PlayerId) => {
      topToShield(playerId);
      sendWsAction(ws, { actionType: "TOP_TO_SHIELD", playerId });
    },
    [topToShield, ws],
  );

  const wrappedTopToGraveyard = useCallback(
    (playerId: PlayerId, amount: number) => {
      topToGraveyard(playerId, amount);
      sendWsAction(ws, { actionType: "TOP_TO_GRAVEYARD", playerId, amount });
    },
    [topToGraveyard, ws],
  );

  const wrappedUntapAll = useCallback(
    (playerId: PlayerId) => {
      untapAll(playerId);
      sendWsAction(ws, { actionType: "UNTAP_ALL", playerId });
    },
    [untapAll, ws],
  );

  const wrappedLinkCard = useCallback(
    (childId: string, parentId: string, fromZone: ZoneName) => {
      linkCard(childId, parentId, fromZone);
      sendWsAction(ws, { actionType: "LINK_CARD", childId, parentId, fromZone });
    },
    [linkCard, ws],
  );

  const wrappedUnlinkCard = useCallback(
    (childId: string, parentId: string, toZone: ZoneName, newIndex?: number) => {
      unlinkCard(childId, parentId, toZone, newIndex);
      sendWsAction(ws, { actionType: "UNLINK_CARD", childId, parentId, toZone, newIndex });
    },
    [unlinkCard, ws],
  );

  // ── DnD ───────────────────────────────────────────────────────────────────
  const { handleDragStart, handleDragEnd, handleDragCancel, isDragging } = useGameDnD({
    zones,
    moveCard: wrappedMoveCard,
    linkCard: wrappedLinkCard,
    showNotification,
    setActiveCard,
    setPreviewCard,
    previewTimerRef: previewTimer,
    isMyTurn,
    myRole,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── UI Handlers ───────────────────────────────────────────────────────────
  const handleCardHover = useCallback(
    (card: GameCard | null, _zone?: ZoneName) => {
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
    },
    [isDragging],
  );

  const handleCardClick = useCallback(
    (card: GameCard, event?: React.MouseEvent) => {
      if (isDragging.current) return;
      if (card.owner !== myRole) return;

      // Read current state imperatively — no stale closures.
      const { currentPlayer: cp, zones: currentZones } = useGameStore.getState();
      if (!currentZones[`${myRole}_hand` as ZoneName]) return;
      if (cp !== myRole) {
        showNotification("¡No es tu turno!", "error");
        return;
      }

      let zone: ZoneName | undefined;
      for (const [z, ids] of Object.entries(currentZones)) {
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
      if (zone.includes("shields")) {
        wrappedToggleFace(card.id);
      }
    },
    [isDragging, wrappedToggleFace, myRole, showNotification],
  );

  const handleCardDoubleClick = useCallback(
    (card: GameCard) => {
      if (isDragging.current) return;
      if (card.owner !== myRole) return;

      const { currentPlayer: cp, zones: currentZones } = useGameStore.getState();
      if (cp !== myRole) return;

      let zone: ZoneName | undefined;
      for (const [z, ids] of Object.entries(currentZones)) {
        if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
      }
      if (zone && (zone.includes("attackZone") || zone.includes("manaZone"))) {
        wrappedToggleTapped(card.id);
      }
    },
    [isDragging, wrappedToggleTapped, myRole],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
      if (card.owner !== myRole) return;
      const { currentPlayer: cp } = useGameStore.getState();
      if (cp !== myRole) return;
      if (zone.includes("manaZone") || zone.includes("shields")) {
        e.preventDefault();
        setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
      }
    },
    [myRole],
  );

  const handlePlaceCard = useCallback(
    (toZone: ZoneName) => {
      if (!placementMenu) return;
      wrappedMoveCard(placementMenu.card.id, placementMenu.fromZone, toZone);
      setPlacementMenu(null);
    },
    [placementMenu, wrappedMoveCard],
  );

  // ── Turn-gated deck actions ───────────────────────────────────────────────
  const execDraw = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    wrappedDrawCards(pid, drawAmt[pid] || 1);
    setDrawAmt((p) => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execMana = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    const amt = manaAmt[pid] || 1;
    for (let i = 0; i < amt; i++) wrappedTopToMana(pid);
    setManaAmt((p) => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execShield = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    const amt = shieldAmt[pid] || 1;
    for (let i = 0; i < amt; i++) wrappedTopToShield(pid);
    setShieldAmt((p) => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execGrave = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    wrappedTopToGraveyard(pid, graveAmt[pid] || 1);
    setGraveAmt((p) => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execLook = (pid: PlayerId) => {
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "private", amount: lookAmt[pid] || 1 });
    setDeckMenu(null);
    setLookAmt((p) => ({ ...p, [pid]: 0 }));
  };
  const execReveal = (pid: PlayerId) => {
    setViewingZone({ zone: `${pid}_mainDeck` as ZoneName, mode: "reveal", amount: revealAmt[pid] || 1 });
    setDeckMenu(null);
    setRevealAmt((p) => ({ ...p, [pid]: 0 }));
  };

  const handleAddExLife = (currentCard: GameCard, amt: number) => {
    const { zones: currentZones } = useGameStore.getState();
    for (let i = 0; i < amt; i++) {
      const deck = currentZones[`${currentCard.owner}_mainDeck` as ZoneName];
      if (deck?.length > 0) {
        wrappedLinkCard(deck[0], currentCard.id, `${currentCard.owner}_mainDeck` as ZoneName);
      } else {
        showNotification("No more cards in deck!");
        break;
      }
    }
    setPlacementMenu(null);
  };

  const handleUnlinkAll = (currentCard: GameCard, target: "hand" | "cemetery" | "deckTop" | "deckBottom") => {
    currentCard.linkedCardIds?.forEach((cid) => {
      let zone: ZoneName = `${currentCard.owner}_hand` as ZoneName;
      let index: number | undefined;
      if (target === "cemetery")   zone  = `${currentCard.owner}_cemetery` as ZoneName;
      if (target === "deckTop")  { zone  = `${currentCard.owner}_mainDeck` as ZoneName; index = 0; }
      if (target === "deckBottom") zone  = `${currentCard.owner}_mainDeck` as ZoneName;
      wrappedUnlinkCard(cid, currentCard.id, zone, index);
    });
    setPlacementMenu(null);
  };

  const handleUnlinkIndividual = (childId: string, parentCard: GameCard, target: "hand" | "cemetery" | "deckTop" | "deckBottom") => {
    let zone: ZoneName = `${parentCard.owner}_hand` as ZoneName;
    let index: number | undefined;
    if (target === "cemetery")   zone  = `${parentCard.owner}_cemetery` as ZoneName;
    if (target === "deckTop")  { zone  = `${parentCard.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === "deckBottom") zone  = `${parentCard.owner}_mainDeck` as ZoneName;
    wrappedUnlinkCard(childId, parentCard.id, zone, index);
    if (parentCard.linkedCardIds?.length === 1) setPlacementMenu(null);
  };

  const handleSendTo = (card: GameCard, target: "deckTop" | "deckBottom" | "cemetery" | "hyperspatial" | "gZone" | "banishZone") => {
    let zone: ZoneName = `${card.owner}_cemetery` as ZoneName;
    let index: number | undefined;
    if (target === "deckTop")     { zone = `${card.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === "deckBottom")    zone = `${card.owner}_mainDeck` as ZoneName;
    if (target === "hyperspatial")  zone = `${card.owner}_hyperspatial` as ZoneName;
    if (target === "gZone")         zone = `${card.owner}_gZone` as ZoneName;
    if (target === "banishZone")    zone = `${card.owner}_banishZone` as ZoneName;
    wrappedMoveCard(card.id, placementMenu.fromZone, zone, index);
    setPlacementMenu(null);
  };



  const handleSurrender = () => {
    if (window.confirm("¿Estás seguro de que quieres rendirte?")) {
      sendWsAction(ws, { actionType: "SURRENDER" });
      alert("Te has rendido.");
      onExit();
    }
  };

  const handleNextPhase = useCallback(() => {
    if (!isMyTurn) {
      showNotification("¡Espera tu turno para avanzar la fase!", "error");
      return;
    }
    wrappedNextPhase();
    

  }, [isMyTurn, wrappedNextPhase, ws, myRole]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isMyTurn) return;
      if (e.key === "n" || e.key === "N") handleNextPhase();
      if (e.key === "d" || e.key === "D") wrappedDrawCards(myRole, 1);
      if (e.key === "u" || e.key === "U") wrappedUntapAll(myRole);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMyTurn, handleNextPhase, wrappedDrawCards, wrappedUntapAll, myRole]);

  if (!mounted) return null;

  const topPid: PlayerId    = myRole === "p1" ? "p2" : "p1";
  const bottomPid: PlayerId = myRole;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="flex h-screen w-full bg-[#0f172a] text-slate-400 overflow-hidden font-sans select-none"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)" }}
      >
        <NotificationSystem notification={notification} />
        <CardPreview previewCard={previewCard} />

        {/* ── Turn indicator ──────────────────────────────────────────────── */}
        {!isMyTurn && (
          <div className="absolute inset-x-0 top-0 flex justify-center pt-3 z-[910] pointer-events-none">
            <div className="flex items-center gap-3 bg-purple-950/90 backdrop-blur border border-purple-500/50 px-5 py-2 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.4)]">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
              <span className="text-purple-200 font-black text-sm tracking-wide uppercase">Turno de {opponentName}</span>
            </div>
          </div>
        )}
        {isMyTurn && (
          <div className="absolute inset-x-0 bottom-[160px] flex justify-center z-[800] pointer-events-none">
            <div className="flex items-center gap-2 bg-emerald-900/80 backdrop-blur border border-emerald-500/40 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-black text-xs tracking-widest uppercase">Tu turno</span>
            </div>
          </div>
        )}

        {/* ── Live action feed ─────────────────────────────────────────────── */}
        <div className="absolute left-4 top-16 z-[920] flex flex-col gap-1.5 pointer-events-none" style={{ maxWidth: "260px" }}>
          {actionFeed.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-purple-500/30 px-3 py-1.5 rounded-lg shadow-lg"
              style={{ animation: "fadeSlideIn 0.25s ease-out" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
              <span className="text-purple-200 text-[11px] font-semibold truncate">{entry.text}</span>
            </div>
          ))}
        </div>

        {/* ── Player name badges ───────────────────────────────────────────── */}
        <div className="absolute top-[52px] right-4 z-[950] flex flex-col gap-1 items-end pointer-events-none">
          <div className={cn(
            "flex items-center gap-2 bg-slate-800/80 backdrop-blur border px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
            !isMyTurn ? "border-purple-500/50 text-purple-300" : "border-slate-600/30 text-slate-400",
          )}>
            <div className={cn("w-2 h-2 rounded-full", !isMyTurn ? "bg-purple-400 animate-pulse" : "bg-slate-600")} />
            {opponentName}
          </div>
        </div>
        <div className="absolute bottom-[168px] right-4 z-[950] flex flex-col gap-1 items-end pointer-events-none">
          <div className={cn(
            "flex items-center gap-2 bg-slate-800/80 backdrop-blur border px-3 py-1.5 rounded-full text-xs font-bold transition-colors",
            isMyTurn ? "border-blue-500/50 text-blue-300" : "border-slate-600/30 text-slate-400",
          )}>
            <div className={cn("w-2 h-2 rounded-full", isMyTurn ? "bg-blue-400 animate-pulse" : "bg-slate-600")} />
            {myName} (Tú)
          </div>
        </div>

        {/* ── Exit / Surrender ─────────────────────────────────────────────── */}
        <div className="absolute top-4 left-4 z-[999] flex gap-2">
          <button
            onClick={handleSurrender}
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

        {/* ── Main board ───────────────────────────────────────────────────── */}
        <main className="flex-1 h-screen flex flex-col relative overflow-hidden bg-[#0a0d14]">
          {/* Opponent section — glows when it's their turn */}
          <div className={cn(
            "transition-all duration-500",
            !isMyTurn ? "ring-2 ring-inset ring-purple-500/40 shadow-[inset_0_0_40px_rgba(147,51,234,0.12)]" : "",
          )}>
            <PlayerSection
              pid={topPid} flipped zones={zones} cards={cards}
              setViewingZone={setViewingZone} handleCardHover={handleCardHover}
              handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
              handleContextMenu={handleContextMenu} setIsBattleHovered={setIsBattleHovered}
            />
          </div>

          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#00f2ff]/80 shadow-[0_0_15px_rgba(0,242,255,0.6)] z-5 pointer-events-none select-none opacity-50" />

          <PhaseHud
            currentPhase={currentPhase}
            currentPlayer={currentPlayer}
            nextPhase={handleNextPhase}
            isMyTurn={isMyTurn}
          />

          {/* My section — glows when it's my turn */}
          <div className={cn(
            "transition-all duration-500",
            isMyTurn ? "ring-2 ring-inset ring-emerald-500/40 shadow-[inset_0_0_40px_rgba(34,197,94,0.10)]" : "",
          )}>
            <PlayerSection
              pid={bottomPid} zones={zones} cards={cards}
              setViewingZone={setViewingZone} handleCardHover={handleCardHover}
              handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
              handleContextMenu={handleContextMenu} setIsBattleHovered={setIsBattleHovered}
            />
          </div>

          {/* Opponent's hand — card backs only */}
          <HandOverlay
            pid={topPid} flipped isOpponent
            zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
          />
          {/* My hand */}
          <HandOverlay
            pid={bottomPid} zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
          />
        </main>

        <DragOverlay dropAnimation={{ duration: 150 }} zIndex={1000}>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        {/* ── Opponent cursor overlay ──────────────────────────────────────── */}
        {opponentCursor && (
          <div
            className="fixed pointer-events-none z-[1100] transition-all duration-75 flex flex-col items-center"
            style={{
              left: `${(1 - opponentCursor.x) * 100}vw`,
              top: `${(1 - opponentCursor.y) * 100}vh`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {opponentCursor.activeCardId && cards[opponentCursor.activeCardId] && (
              <div className="scale-[0.8] opacity-80 mb-2 rotate-180 shadow-[0_0_20px_rgba(147,51,234,0.6)]">
                <Card card={cards[opponentCursor.activeCardId]} isOverlay />
              </div>
            )}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="drop-shadow-md fill-purple-500 rotate-180">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
            <div className="mt-1 px-2 py-0.5 bg-purple-900/80 text-purple-200 text-[10px] font-bold rounded-full whitespace-nowrap shadow border border-purple-500/50">
              {opponentName}
            </div>
          </div>
        )}

        <ContextMenu
          contextMenu={contextMenu} setContextMenu={setContextMenu}
          toggleTapped={wrappedToggleTapped} toggleFace={wrappedToggleFace}
          setViewingZone={setViewingZone}
        />

        <PlacementMenu
          placementMenu={placementMenu} setPlacementMenu={setPlacementMenu}
          cards={cards} exLifeAmt={exLifeAmt} setExLifeAmt={setExLifeAmt}
          toggleTapped={wrappedToggleTapped} handlePlaceCard={handlePlaceCard}
          menuRef={menuRef} onAddExLife={handleAddExLife}
          onUnlinkAll={handleUnlinkAll} onUnlinkIndividual={handleUnlinkIndividual}
          onSendTo={handleSendTo}
        />

        <ViewModal
          viewingZone={viewingZone} setViewingZone={setViewingZone}
          zones={zones} cards={cards} currentPlayer={myRole}
          handleCardHover={handleCardHover}
          handleCardClick={handleCardClick}
          handleCardDoubleClick={handleCardDoubleClick}
        />

        <DeckMenu
          deckMenu={deckMenu} setDeckMenu={setDeckMenu}
          zones={zones} menuRef={menuRef}
          drawAmt={drawAmt} setDrawAmt={setDrawAmt}
          manaAmt={manaAmt} setManaAmt={setManaAmt}
          shieldAmt={shieldAmt} setShieldAmt={setShieldAmt}
          graveAmt={graveAmt} setGraveAmt={setGraveAmt}
          lookAmt={lookAmt} setLookAmt={setLookAmt}
          revealAmt={revealAmt} setRevealAmt={setRevealAmt}
          execDraw={execDraw} execMana={execMana}
          execShield={execShield} execGrave={execGrave}
          execLook={execLook} execReveal={execReveal}
          shuffleDeck={wrappedShuffleDeck} setViewingZone={setViewingZone}
        />
      </div>
    </DndContext>
  );
}
