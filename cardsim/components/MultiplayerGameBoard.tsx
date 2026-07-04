"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragOverlay, pointerWithin, rectIntersection, MeasuringStrategy, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { useGameStore, GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { Card } from "./Card";
import { Zap, Eye, Hand, Layers, X, ChevronRight, RefreshCw, CornerUpLeft, Sword, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

// New Components
import { PhaseHud } from "./PhaseHud";
import { NotificationSystem, NotificationState } from "./NotificationSystem";
import { CardDisplaySide } from "./CardDisplaySide";
import { PlayerSection } from "./PlayerSection";
import { HandOverlay } from "./HandOverlay";
import { PlacementMenu } from "./PlacementMenu";
import { ContextMenu } from "./ContextMenu";
import { DeckMenu } from "./DeckMenu";
import { ViewModal } from "./ViewModal";

// New Hooks
import { useGameHotkeys } from "../lib/useGameHotkeys";
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
let feedCounter = 0;

function sendWsAction(ws: WebSocket, action: GameAction) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "GAME_ACTION", payload: action }));

    if (
      action.actionType !== "CURSOR_MOVE" &&
      action.actionType !== "FULL_SYNC" &&
      action.actionType !== "REQUEST_SYNC" &&
      action.actionType !== "SURRENDER"
    ) {
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
    case "MOVE_CARDS_BATCH":  return `${opponentName} movió varias cartas`;
    case "EVOLVE_CARD":       return `${opponentName} evolucionó/apiló una carta`;
    case "DRAW_CARDS":       return `${opponentName} robó ${action.amount} carta(s)`;
    case "SHUFFLE_DECK":     return `${opponentName} barajó su mazo`;
    case "TOGGLE_TAPPED":    return `${opponentName} giró/desgiró una carta`;
    case "TOGGLE_TAPPED_BATCH": return `${opponentName} giró/desgiró varias cartas`;
    case "TOGGLE_FACE":      return `${opponentName} volteó una carta`;
    case "TOGGLE_FACE_BATCH": return `${opponentName} volteó varias cartas`;
    case "CYCLE_FACE":       return `${opponentName} cambió el lado de una carta`;
    case "CYCLE_FACE_BATCH":  return `${opponentName} cambió el lado de varias cartas`;
    case "NEXT_PHASE":       return `${opponentName} avanzó la fase`;
    case "TOP_TO_MANA":      return `${opponentName} cargó maná`;
    case "TOP_TO_SHIELD":    return `${opponentName} colocó escudo`;
    case "TOP_TO_GRAVEYARD": return `${opponentName} mandó ${action.amount} al cementerio`;
    case "UNTAP_ALL":        return `${opponentName} desgiró todo`;
    case "PING_CARD_EFFECT":  return `${opponentName} activó el efecto de una carta`;
    case "EXEC_REVOLUTION_CHANGE": return `${opponentName} realizó Revolution Change`;
    default:                 return null;
  }
}

function applyRemoteAction(action: GameAction) {
  const store = useGameStore.getState();

  switch (action.actionType) {
    case "ZONE_SYNC":
      if (action.zones) store.applyRemoteZones(action.zones);
      break;
    case "MOVE_CARD":
      store.moveCard(action.cardId, action.fromZone, action.toZone, action.newIndex, action.boardX, action.boardY);
      break;
    case "MOVE_CARDS_BATCH":
      store.moveCardsBatch(action.cardIds, action.toZone);
      break;
    case "EVOLVE_CARD":
      store.evolveCard(action.sourceId, action.targetId, action.under, action.face);
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
    case "TOGGLE_TAPPED_BATCH":
      store.toggleTappedBatch(action.cardIds);
      break;
    case "TOGGLE_FACE":
      store.toggleFace(action.cardId);
      break;
    case "TOGGLE_FACE_BATCH":
      store.toggleFaceBatch(action.cardIds);
      break;
    case "CYCLE_FACE":
      store.cycleFace(action.cardId);
      break;
    case "CYCLE_FACE_BATCH":
      store.cycleFaceBatch(action.cardIds);
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
    case "PING_CARD_EFFECT":
      store.pingCardEffect(action.cardId);
      break;
    case "EXEC_REVOLUTION_CHANGE":
      store.execRevolutionChange(action.handCardId, action.boardCardId);
      break;
    case "CONFIRM_TARGET":
      store.confirmTarget(action.targetId);
      break;
    case "CLEAR_COMBAT_LINKS":
      store.clearCombatLinks();
      break;
    case "FULL_SYNC":
      if (action.zones && action.cards) {
        store.applyFullSync(action.zones, action.cards, action.currentPlayer, action.currentPhase);
      }
      break;
    case "REQUEST_SYNC":
      if (store.myRole === "p1") {
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

// ─── Child Components for trigger animations ────────────────────────────────
const TrackingTriggerEffect = ({ effect }: { effect: { type: string, name: string, id: string, targetZone?: string } }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId: number;
    let hasFoundCard = false;

    const track = () => {
      if (ref.current) {
        const safeId = CSS.escape(effect.id);
        const safeZone = effect.targetZone ? CSS.escape(effect.targetZone) : null;
        const selector = safeZone
          ? `[data-tracking-anchor="${safeId}"][data-tracking-zone="${safeZone}"]`
          : `[data-tracking-anchor="${safeId}"]`;

        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          if (!hasFoundCard) {
            hasFoundCard = true;
            ref.current.style.opacity = "1";
          }
          const rect = el.getBoundingClientRect();
          ref.current.style.left = `${rect.left + rect.width / 2}px`;
          ref.current.style.top = `${rect.top + rect.height / 2}px`;
        } else if (!hasFoundCard) {
          ref.current.style.opacity = "0";
        }
      }
      frameId = requestAnimationFrame(track);
    };
    frameId = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frameId);
  }, [effect.id, effect.targetZone]);

  return (
    <motion.div
      ref={ref}
      className="fixed z-[9999] pointer-events-none flex flex-col items-center justify-end transition-opacity duration-100"
      style={{ left: window.innerWidth / 2, top: window.innerHeight / 2, opacity: 0 }}
    >
      <div className="absolute bottom-1/2 translate-y-1/2 z-0 pointer-events-none flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-20 h-20 bg-yellow-200 rounded-full blur-2xl"
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.8, opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute w-16 h-16 rounded-full border-2 border-yellow-400 shadow-[0_0_15px_#facc15]"
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 2.2, opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
          className="absolute w-16 h-16 rounded-full border border-yellow-500 shadow-[0_0_20px_#eab308]"
        />
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: (Math.random() - 0.5) * 100,
              y: (Math.random() - 0.5) * 100,
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0]
            }}
            transition={{ duration: 0.8, ease: "easeOut", delay: Math.random() * 0.3 }}
            className="absolute w-1 h-1 bg-yellow-200 rounded-full shadow-[0_0_8px_#fef08a]"
          />
        ))}
      </div>
      <motion.div
        initial={{ height: 0, opacity: 0, scaleX: 0.2 }}
        animate={{ height: 100, opacity: [0, 1, 0], scaleX: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute bottom-1/2 translate-y-1/2 w-16 bg-gradient-to-t from-yellow-400/90 via-yellow-200/40 to-transparent blur-md origin-bottom"
      />
      <motion.div
        initial={{ opacity: 0, y: 0, scale: 0, rotateX: -90 }}
        animate={{ opacity: 1, y: -75, scale: 0.8, rotateX: 0 }}
        exit={{ opacity: 0, y: -115, scale: 1.0, filter: "blur(8px)" }}
        transition={{ type: "spring", damping: 15, stiffness: 120, delay: 0.1 }}
        className="absolute bottom-1/2 translate-y-1/2 flex flex-col items-center"
      >
        <div className="relative flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -inset-3 bg-yellow-400/40 blur-lg rounded-full"
          />
          <div className="relative z-10 w-12 h-12 drop-shadow-[0_0_15px_rgba(250,204,21,0.7)]">
            <img
              src="/shield_trigger_icon.jpeg"
              alt="Shield Trigger"
              className="w-full h-full object-contain rounded-lg border border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
            />
          </div>
        </div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 bg-black/95 border border-yellow-400/80 px-3 py-1 rounded-lg backdrop-blur-xl shadow-[0_0_12px_rgba(250,204,21,0.4)]"
        >
          <div className="text-yellow-400 font-black text-[8px] uppercase tracking-[0.15em] italic text-center drop-shadow-md">
            {effect.type}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const RevolutionChangeEffect = ({ effect, onComplete }: { effect: { handCardId: string, boardCardId: string }, onComplete: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    let frameId: number;
    const track = () => {
      if (ref.current) {
        const safeId = CSS.escape(effect.boardCardId);
        const el = document.querySelector(`[data-tracking-anchor="${safeId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const surface = el.closest('.field-3d-surface');
          if (surface) {
            const sRect = surface.getBoundingClientRect();
            ref.current.style.left = `${((rect.left + rect.width / 2 - sRect.left) / sRect.width) * 100}%`;
            ref.current.style.top = `${((rect.top + rect.height / 2 - sRect.top) / sRect.height) * 100}%`;
          }
        }
      }
      frameId = requestAnimationFrame(track);
    };
    frameId = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frameId);
  }, [effect.boardCardId]);

  return (
    <motion.div
      ref={ref}
      className="absolute z-[10000] pointer-events-none flex items-center justify-center"
      style={{ left: "50%", top: "50%" }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 2, 3],
          opacity: [0, 0.8, 0],
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute w-24 h-24 bg-white rounded-full blur-xl mix-blend-screen"
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0.5, 1.5 + i * 0.3],
            opacity: [0, 0.6, 0],
            rotate: i % 2 === 0 ? [0, 180] : [0, -180]
          }}
          transition={{ duration: 0.8 + i * 0.2, ease: "easeOut", delay: i * 0.1 }}
          className="absolute w-36 h-36 border-[1px] border-indigo-400/30 rounded-full border-dashed"
        />
      ))}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
        transition={{ duration: 0.7 }}
        className="absolute w-24 h-24 bg-gradient-to-r from-red-600 via-indigo-600 to-purple-600 rounded-full blur-2xl"
      />
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            scale: [0, 1, 0],
            rotate: Math.random() * 360
          }}
          transition={{ duration: 0.8, ease: "easeOut", delay: Math.random() * 0.15 }}
          className="absolute w-1 h-1 bg-cyan-300 shadow-[0_0_6px_cyan]"
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        />
      ))}
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
        animate={{
          y: [-10, -65],
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1.1, 1.2, 1],
          filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(4px)']
        }}
        transition={{ duration: 1.6, times: [0, 0.2, 0.8, 1] }}
        className="absolute flex flex-col items-center"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-lg scale-110 animate-pulse" />
          <span className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,1)] uppercase tracking-[0.15em]">
            Revolution Change
          </span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-0.5"
          >
            <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-white/40" />
            <span className="text-[8px] font-black text-indigo-200/60 tracking-[0.2em] uppercase">Tactical Shift</span>
            <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-white/40" />
          </motion.div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 w-screen h-screen bg-white/5 pointer-events-none"
        style={{ left: '-50vw', top: '-50vh' }}
      />
    </motion.div>
  );
};

const InvasionEffect = ({ effect, onComplete }: { effect: { cardId: string }, onComplete: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    let frameId: number;
    const track = () => {
      if (ref.current) {
        const safeId = CSS.escape(effect.cardId);
        const el = document.querySelector(`[data-tracking-anchor="${safeId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const surface = el.closest('.field-3d-surface');
          if (surface) {
            const sRect = surface.getBoundingClientRect();
            ref.current.style.left = `${((rect.left + rect.width / 2 - sRect.left) / sRect.width) * 100}%`;
            ref.current.style.top = `${((rect.top + rect.height / 2 - sRect.top) / sRect.height) * 100}%`;
          }
        }
      }
      frameId = requestAnimationFrame(track);
    };
    frameId = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frameId);
  }, [effect.cardId]);

  return (
    <motion.div
      ref={ref}
      className="absolute z-[10000] pointer-events-none flex items-center justify-center"
      style={{ left: "50%", top: "50%" }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 4, 7],
          opacity: [0, 0.9, 0],
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute w-24 h-24 bg-red-400 rounded-full blur-[30px] mix-blend-screen"
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0.5, 3 + i * 0.6],
            opacity: [0, 0.7, 0],
            rotate: i % 2 === 0 ? [0, 90] : [0, -90]
          }}
          transition={{ duration: 0.7 + i * 0.15, ease: "easeOut", delay: i * 0.05 }}
          className="absolute w-48 h-48 border-2 border-orange-500/50 rounded-full border-dashed"
        />
      ))}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 6], opacity: [1, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute w-32 h-32 bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400 rounded-full blur-3xl"
      />
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 500,
            y: (Math.random() - 0.5) * 500,
            scale: [0, 1.5, 0],
            rotate: Math.random() * 360
          }}
          transition={{ duration: 0.8, ease: "easeOut", delay: Math.random() * 0.1 }}
          className="absolute w-2 h-2 bg-yellow-300 shadow-[0_0_10px_yellow]"
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        />
      ))}
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
        animate={{
          y: [-20, -110],
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1.4, 1.5, 1],
          filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(5px)']
        }}
        transition={{ duration: 1.6, times: [0, 0.2, 0.8, 1] }}
        className="absolute flex flex-col items-center"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-red-600/30 blur-2xl scale-150 animate-pulse" />
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-orange-400 to-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,1)] uppercase tracking-[0.2em]">
              INVASION
            </span>
            <motion.img
              src="/invasion_icon.png"
              alt="Invasion Icon"
              className="w-10 h-10 object-contain drop-shadow-[0_0_20px_rgba(255,165,0,0.8)]"
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', damping: 10 }}
            />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 mt-1"
          >
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-yellow-200/50" />
            <span className="text-[12px] font-black text-orange-200/80 tracking-[0.5em] uppercase">Aggressive Swarm</span>
            <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-yellow-200/50" />
          </motion.div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 w-screen h-screen bg-red-500/5 pointer-events-none"
        style={{ left: '-50vw', top: '-50vh' }}
      />
    </motion.div>
  );
};

const EvolutionEffect = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed z-[15000] pointer-events-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y - 60 }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 3], opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute w-48 h-48 bg-indigo-500/30 rounded-full blur-[40px]"
      />
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ y: 0, opacity: 0, scale: 0.7, filter: 'blur(3px)' }}
          animate={{ y: -40, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{
            y: -80, opacity: 0, scale: 1.1, filter: 'blur(3px)',
            transition: { duration: 0.1, ease: "easeIn" }
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative flex flex-col items-center"
        >
          <div className="absolute inset-0 bg-indigo-500/20 blur-lg animate-pulse" />
          <h1
            className="text-4xl font-black text-white italic tracking-[0.2em] drop-shadow-[0_0_15px_rgba(99,102,241,1)] uppercase"
            style={{ textShadow: "0 0 10px #818cf8, 0 0 20px #6366f1" }}
          >
            EVOLUTION
          </h1>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Multiplayer Game Board Component ─────────────────────────────────────────
export function MultiplayerGameBoard({
  ws,
  myRole,
  myDeckCards,
  opponentDeckCards,
  opponentName,
  myName,
  onExit,
}: MultiplayerGameBoardProps) {
  const cards         = useGameStore((s) => s.cards);
  const zones         = useGameStore((s) => s.zones);
  const currentPhase  = useGameStore((s) => s.currentPhase);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  const initializeGameFromDecks = useGameStore((s) => s.initializeGameFromDecks);
  const moveCard       = useGameStore((s) => s.moveCard);
  const moveCardsBatch = useGameStore((s) => s.moveCardsBatch);
  const evolveCard     = useGameStore((s) => s.evolveCard);
  const drawCards      = useGameStore((s) => s.drawCards);
  const shuffleDeck    = useGameStore((s) => s.shuffleDeck);
  const toggleTapped   = useGameStore((s) => s.toggleTapped);
  const toggleTappedBatch = useGameStore((s) => s.toggleTappedBatch);
  const toggleFace     = useGameStore((s) => s.toggleFace);
  const toggleFaceBatch = useGameStore((s) => s.toggleFaceBatch);
  const cycleFace      = useGameStore((s) => s.cycleFace);
  const cycleFaceBatch = useGameStore((s) => s.cycleFaceBatch);
  const nextPhase      = useGameStore((s) => s.nextPhase);
  const topToMana      = useGameStore((s) => s.topToMana);
  const topToShield    = useGameStore((s) => s.topToShield);
  const topToGraveyard = useGameStore((s) => s.topToGraveyard);
  const untapAll       = useGameStore((s) => s.untapAll);
  const pingCardEffect = useGameStore((s) => s.pingCardEffect);
  
  const targetingMode  = useGameStore((s) => s.targetingMode);
  const startTargeting = useGameStore((s) => s.startTargeting);
  const cancelTargeting = useGameStore((s) => s.cancelTargeting);
  const confirmTarget  = useGameStore((s) => s.confirmTarget);
  const combatLinks    = useGameStore((s) => s.combatLinks);
  const clearCombatLinks = useGameStore((s) => s.clearCombatLinks);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleSelection = useGameStore((s) => s.toggleSelection);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const setSelection = useGameStore((s) => s.setSelection);

  const floatingShields = useGameStore((s) => s.floatingShields);
  const setFloatingShields = useGameStore((s) => s.setFloatingShields);
  const revealedShieldIds = useGameStore((s) => s.revealedShieldIds);
  const setRevealedShieldIds = useGameStore((s) => s.setRevealedShieldIds);
  const peekingShieldIds = useGameStore((s) => s.peekingShieldIds);
  const setPeekingShieldIds = useGameStore((s) => s.setPeekingShieldIds);

  const activeTriggerEffect = useGameStore((s) => s.activeTriggerEffect);
  const setActiveTriggerEffect = useGameStore((s) => s.setActiveTriggerEffect);

  const revolutionChangeEffect = useGameStore((s) => s.revolutionChangeEffect);
  const setRevolutionChangeEffect = useGameStore((s) => s.setRevolutionChangeEffect);
  const execRevolutionChange = useGameStore((s) => s.execRevolutionChange);

  const invasionEffect = useGameStore((s) => s.invasionEffect);
  const setInvasionEffect = useGameStore((s) => s.setInvasionEffect);

  const inspectedStackCardId = useGameStore((s) => s.inspectedStackCardId);
  const setInspectedStackCardId = useGameStore((s) => s.setInspectedStackCardId);

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
  const [targetMousePos, setTargetMousePos] = useState<{ x: number, y: number } | null>(null);

  const [evolutionRequest, setEvolutionRequest] = useState<{ sourceId: string, targetId: string, fromZone: ZoneName, toZone: ZoneName } | null>(null);
  const [shieldStackRequest, setShieldStackRequest] = useState<{ sourceId: string, targetId: string, fromZone: ZoneName, toZone: ZoneName } | null>(null);
  const [manaRequest, setManaRequest] = useState<{ cardIds: string[], fromZone: ZoneName, toZone: ZoneName, fromDeck?: PlayerId } | null>(null);
  const [evolutionEffectPos, setEvolutionEffectPos] = useState<{ x: number, y: number } | null>(null);
  const [activeFloatingId, setActiveFloatingId] = useState<string | null>(null);
  const [isOverStackTarget, setIsOverStackTarget] = useState(false);
  const [isOverManaZone, setIsOverManaZone] = useState(false);
  const [isOverShieldZone, setIsOverShieldZone] = useState(false);
  const [isOverDrawerZone, setIsOverDrawerZone] = useState(false);
  const [isOverExtraZone, setIsOverExtraZone] = useState(false);

  const menuRef      = useRef<HTMLDivElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef     = useRef<HTMLDivElement>(null);

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
    (window as any)._cardsim_ws = ws;

    const restoredFlag = (window as any).__cardsim_state_restored;
    if (restoredFlag) {
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

    initializeGameFromDecks(myDeckCards, opponentDeckCards, myRole);

    const timer = setTimeout(() => {
      const state = useGameStore.getState();
      
      if (myRole === "p1") {
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
  const opponentNameRef  = useRef(opponentName);
  const pushFeedRef      = useRef(pushActionFeed);
  const showNotifRef     = useRef(showNotification);
  const setCursorRef     = useRef(setOpponentCursor);

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
          setCursorRef.current({ x: action.x, y: action.y, activeCardId: action.activeCardId });
          return;
        }

        applyRemoteAction(action);

        if (action.actionType !== "ZONE_SYNC") {
          const desc = describAction(action, opponentNameRef.current);
          if (desc) pushFeedRef.current(desc);
        }
      } else if (msg.type === "GAME_STATE_RESTORE") {
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
  }, [ws]);

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

  const wrappedMoveCardsBatch = useCallback(
    (cardIds: string[], toZone: ZoneName) => {
      moveCardsBatch(cardIds, toZone);
      sendWsAction(ws, { actionType: "MOVE_CARDS_BATCH", cardIds, toZone });
    },
    [moveCardsBatch, ws],
  );

  const wrappedEvolveCard = useCallback(
    (sourceId: string, targetId: string, under?: boolean, face?: 'up' | 'down') => {
      evolveCard(sourceId, targetId, under, face);
      sendWsAction(ws, { actionType: "EVOLVE_CARD", sourceId, targetId, under, face });
    },
    [evolveCard, ws],
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

  const wrappedToggleTappedBatch = useCallback(
    (cardIds: string[]) => {
      toggleTappedBatch(cardIds);
      sendWsAction(ws, { actionType: "TOGGLE_TAPPED_BATCH", cardIds });
    },
    [toggleTappedBatch, ws],
  );

  const wrappedToggleFace = useCallback(
    (cardId: string) => {
      toggleFace(cardId);
      sendWsAction(ws, { actionType: "TOGGLE_FACE", cardId });
    },
    [toggleFace, ws],
  );

  const wrappedToggleFaceBatch = useCallback(
    (cardIds: string[]) => {
      toggleFaceBatch(cardIds);
      sendWsAction(ws, { actionType: "TOGGLE_FACE_BATCH", cardIds });
    },
    [toggleFaceBatch, ws],
  );

  const wrappedCycleFace = useCallback(
    (cardId: string) => {
      cycleFace(cardId);
      sendWsAction(ws, { actionType: "CYCLE_FACE", cardId });
    },
    [cycleFace, ws],
  );

  const wrappedCycleFaceBatch = useCallback(
    (cardIds: string[]) => {
      cycleFaceBatch(cardIds);
      sendWsAction(ws, { actionType: "CYCLE_FACE_BATCH", cardIds });
    },
    [cycleFaceBatch, ws],
  );

  const wrappedNextPhase = useCallback(() => {
    nextPhase();
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

  const wrappedPingCardEffect = useCallback(
    (cardId: string) => {
      pingCardEffect(cardId);
      sendWsAction(ws, { actionType: "PING_CARD_EFFECT", cardId });
    },
    [pingCardEffect, ws],
  );

  const wrappedExecRevolutionChange = useCallback(
    (handCardId: string, boardCardId: string) => {
      execRevolutionChange(handCardId, boardCardId);
      sendWsAction(ws, { actionType: "EXEC_REVOLUTION_CHANGE", handCardId, boardCardId });
    },
    [execRevolutionChange, ws],
  );

  const wrappedConfirmTarget = useCallback(
    (targetId: string) => {
      confirmTarget(targetId);
      sendWsAction(ws, { actionType: "CONFIRM_TARGET", targetId });
    },
    [confirmTarget, ws],
  );

  const wrappedClearCombatLinks = useCallback(
    () => {
      clearCombatLinks();
      sendWsAction(ws, { actionType: "CLEAR_COMBAT_LINKS" });
    },
    [clearCombatLinks, ws],
  );

  // ── Drag and Drop hook instantiation ───────────────────────────────────────
  const { handleDragStart, handleDragEnd, handleDragCancel, isDragging } = useGameDnD({
    zones,
    moveCard: wrappedMoveCard,
    showNotification,
    setActiveCard,
    setPreviewCard,
    previewTimerRef: previewTimer,
    selectedCardIds,
    moveCardsBatch: wrappedMoveCardsBatch,
    clearSelection,
    onEvolveRequest: (sourceId, targetId, fromZone, toZone) => {
      if (useGameStore.getState().cards[sourceId]?.owner !== myRole) return;
      setEvolutionRequest({ sourceId, targetId, fromZone, toZone });
    },
    onShieldStackRequest: (sourceId, targetId, fromZone, toZone) => {
      if (useGameStore.getState().cards[sourceId]?.owner !== myRole) return;
      setShieldStackRequest({ sourceId, targetId, fromZone, toZone });
    },
    onManaRequest: (cardIds, fromZone, toZone) => {
      if (useGameStore.getState().cards[cardIds[0]]?.owner !== myRole) return;
      setManaRequest({ cardIds, fromZone, toZone });
    }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Custom collision logic
  const customCollisionDetection = useCallback((args: any) => {
    let collisions = pointerWithin(args);
    if (collisions.length === 0) {
      collisions = rectIntersection(args);
    }
    if (collisions.length > 0) {
      const extraZoneCollision = collisions.find(c => c.id.toString().includes('extraZone'));
      if (extraZoneCollision) return [extraZoneCollision];

      const drawerZoneCollision = collisions.find(c => c.id.toString().includes('drawerZone'));
      if (drawerZoneCollision) return [drawerZoneCollision];
    }
    return collisions;
  }, []);

  // ── Rubberband Selection ────────────────────────────────────────────────────
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

  useEffect(() => {
    if (!selectionBox) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setSelectionBox(prev => prev ? { ...prev, endX: currentX, endY: currentY } : null);

      const selectionRect = {
        left: Math.min(selectionBox.startX, currentX) + rect.left,
        top: Math.min(selectionBox.startY, currentY) + rect.top,
        right: Math.max(selectionBox.startX, currentX) + rect.left,
        bottom: Math.max(selectionBox.startY, currentY) + rect.top
      };

      const cardElements = document.querySelectorAll('.card-element');
      const newlySelectedIds: string[] = [];

      cardElements.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const isIntersecting = (
          elRect.left < selectionRect.right &&
          elRect.right > selectionRect.left &&
          elRect.top < selectionRect.bottom &&
          elRect.bottom > selectionRect.top
        );

        if (isIntersecting) {
          const id = el.getAttribute('data-card-id');
          const zone = el.getAttribute('data-card-zone');
          if (id && zone && !zone.includes('shields')) {
            const cardObj = cards[id];
            if (cardObj && cardObj.owner === myRole) {
              newlySelectedIds.push(id);
            }
          }
        }
      });

      setSelection(newlySelectedIds);
    };

    const handleGlobalMouseUp = () => {
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectionBox, cards, myRole]);

  // ─── Targeting Mode Mouse Tracking ──────────────────────────────────────────
  useEffect(() => {
    if (!targetingMode.active) {
      setTargetMousePos(null);
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      setTargetMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-element') && !target.closest('.player-avatar') && !target.closest('.shield-widget')) {
        cancelTargeting();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [targetingMode.active, cancelTargeting]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (targetingMode.active) {
      const playerTarget = target.closest('.player-target');
      if (playerTarget) {
        const id = playerTarget.getAttribute('data-card-id');
        if (id) {
          wrappedConfirmTarget(id);
          setTargetMousePos(null);
          return;
        }
      }
    }

    const isInteractive = target.closest('.card-element') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('.context-menu') ||
      target.closest('.placement-menu') ||
      target.closest('.deck-menu') ||
      target.closest('.player-target');

    if (isInteractive) return;

    if (!e.shiftKey && !e.ctrlKey) {
      clearSelection();
      setActiveFloatingId(null);
    }

    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
    }
  }, [clearSelection, targetingMode.active, wrappedConfirmTarget]);

  // ─── UI click handlers ──────────────────────────────────────────────────────
  const handleCardHover = useCallback((card: GameCard | null, _zone?: ZoneName) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    if (isDragging.current) return;
    if (!card) return;
    if (card.face === "up") {
      previewTimer.current = setTimeout(() => setPreviewCard(card), 150);
    }
  }, [isDragging]);

  const handleCardClick = useCallback((card: GameCard, event?: React.MouseEvent) => {
    if (isDragging.current) return;

    if (targetingMode.active) {
      if (card.owner === myRole && targetingMode.sourceId) {
        if (targetingMode.type === 'evolve') {
          let fromZone: ZoneName | undefined;
          let toZone: ZoneName | undefined;
          for (const [z, ids] of Object.entries(zones)) {
            if (ids.includes(targetingMode.sourceId)) fromZone = z as ZoneName;
            if (ids.includes(card.id)) toZone = z as ZoneName;
          }
          if (fromZone && toZone) {
            setEvolutionRequest({
              sourceId: targetingMode.sourceId,
              targetId: card.id,
              fromZone,
              toZone
            });
          }
          cancelTargeting();
        } else if (targetingMode.type === 'stack') {
          wrappedConfirmTarget(card.id);
          cancelTargeting();
        } else {
          wrappedConfirmTarget(card.id);
        }
      } else if (card.owner !== myRole) {
        // Target an opponent card
        wrappedConfirmTarget(card.id);
      }
      setTargetMousePos(null);
      return;
    }

    if (card.face === 'up') {
      setPreviewCard(card);
    }

    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }

    if (zone?.includes('shields')) {
      if (floatingShields.includes(card.id)) {
        setFloatingShields(prev => prev.filter(id => id !== card.id));
      } else {
        setFloatingShields(prev => [...prev.slice(-4), card.id]);
      }
      return;
    }

    if (card.owner === myRole) {
      toggleSelection(card.id);
    }
  }, [isDragging, toggleSelection, targetingMode, wrappedConfirmTarget, zones, floatingShields, myRole]);

  const handleCardDoubleClick = useCallback((card: GameCard) => {
    if (isDragging.current) return;
    if (card.owner !== myRole) return;
    if (!isMyTurn) return;

    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (!zone) return;

    if (zone.includes("hand")) {
      const toZone = `${card.owner}_attackZone_back` as ZoneName;
      if (selectedCardIds.includes(card.id)) {
        wrappedMoveCardsBatch(selectedCardIds, toZone);
        clearSelection();
      } else {
        wrappedMoveCard(card.id, zone, toZone);
      }
    } else if (zone.includes("attackZone") || zone.includes("manaZone")) {
      if (selectedCardIds.includes(card.id)) {
        wrappedToggleTappedBatch(selectedCardIds);
      } else {
        wrappedToggleTapped(card.id);
      }
    } else if (zone.includes("shields")) {
      if (selectedCardIds.includes(card.id)) {
        wrappedToggleFaceBatch(selectedCardIds);
      } else {
        wrappedToggleFace(card.id);
      }
    }
  }, [isDragging, zones, wrappedToggleTapped, wrappedToggleTappedBatch, selectedCardIds, wrappedMoveCard, wrappedMoveCardsBatch, clearSelection, wrappedToggleFace, wrappedToggleFaceBatch, myRole, isMyTurn]);

  const handleContextMenu = useCallback((e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    e.preventDefault();
    if (card.owner !== myRole) return;

    if (targetingMode.active) {
      cancelTargeting();
      return;
    }

    const isInsideViewModal = viewingZone && viewingZone.zone === zone;
    if (isInsideViewModal) {
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
      return;
    }

    if (zone.includes("mainDeck")) {
      setDeckMenu({ pid: card.owner, x: e.clientX, y: e.clientY });
      return;
    }

    if (zone.includes("hand") || zone.includes("attackZone") || zone.includes("manaZone")) {
      setPlacementMenu({ card, fromZone: zone, x: e.clientX, y: e.clientY });
    } else {
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
    }
  }, [targetingMode, viewingZone, cancelTargeting, myRole]);

  const handleStackWindowContextMenu = useCallback((e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    e.preventDefault();
    if (card.owner !== myRole) return;
    setPlacementMenu({ card, fromZone: zone, x: e.clientX, y: e.clientY, isStackWindow: true });
  }, [myRole]);

  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    if (!isMyTurn) {
      showNotification("¡Espera tu turno para mover cartas!", "error");
      setPlacementMenu(null);
      return;
    }
    const { id } = placementMenu.card;
    const cardIds = selectedCardIds.includes(id) ? selectedCardIds : [id];

    if (toZone.includes("manaZone")) {
      setManaRequest({ cardIds, fromZone: placementMenu.fromZone, toZone });
      setPlacementMenu(null);
      return;
    }

    if (selectedCardIds.includes(id)) {
      wrappedMoveCardsBatch(selectedCardIds, toZone);
      clearSelection();
    } else {
      wrappedMoveCard(id, placementMenu.fromZone, toZone);
    }
    setPlacementMenu(null);
  }, [placementMenu, wrappedMoveCard, wrappedMoveCardsBatch, selectedCardIds, clearSelection, isMyTurn, showNotification]);

  // Turn-gated Deck Menu executors
  const execDraw = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    wrappedDrawCards(pid, drawAmt[pid] || 1);
    setDrawAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  
  const execMana = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    const amt = manaAmt[pid] || 1;
    const deckKey = `${pid}_mainDeck` as ZoneName;
    const manaKey = `${pid}_manaZone` as ZoneName;
    const cardIds = zones[deckKey].slice(0, amt);

    if (cardIds.length > 0) {
      setManaRequest({
        cardIds,
        fromZone: deckKey,
        toZone: manaKey,
        fromDeck: pid
      });
    }
    setManaAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };

  const execShield = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    const amt = shieldAmt[pid] || 1;
    for (let i = 0; i < amt; i++) wrappedTopToShield(pid);
    setShieldAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };

  const execGrave = (pid: PlayerId) => {
    if (pid !== myRole || !isMyTurn) return;
    wrappedTopToGraveyard(pid, graveAmt[pid] || 1);
    setGraveAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };

  const execLook = (pid: PlayerId) => {
    const zone = `${pid}_mainDeck` as ZoneName;
    const amount = lookAmt[pid] || 1;
    const cardIds = zones[zone].slice(0, amount);
    setViewingZone({ zone, mode: "private", amount, cardIds });
    setDeckMenu(null);
    setLookAmt(p => ({ ...p, [pid]: 0 }));
  };

  const execReveal = (pid: PlayerId) => {
    const zone = `${pid}_mainDeck` as ZoneName;
    const amount = revealAmt[pid] || 1;
    const cardIds = zones[zone].slice(0, amount);
    setViewingZone({ zone, mode: "reveal", amount, cardIds });
    setDeckMenu(null);
    setRevealAmt(p => ({ ...p, [pid]: 0 }));
  };

  const handleSendTo = (card: GameCard, target: 'deckTop' | 'deckBottom' | 'cemetery' | 'hyperspatial' | 'gZone' | 'banishZone') => {
    if (!isMyTurn) return;
    let zone: ZoneName = `${card.owner}_cemetery` as ZoneName;
    let index: number | undefined;
    if (target === 'deckTop') { zone = `${card.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === 'deckBottom') zone = `${card.owner}_mainDeck` as ZoneName;
    if (target === 'hyperspatial') zone = `${card.owner}_hyperspatial` as ZoneName;
    if (target === 'gZone') zone = `${card.owner}_gZone` as ZoneName;
    if (target === 'banishZone') zone = `${card.owner}_banishZone` as ZoneName;

    if (selectedCardIds.includes(card.id)) {
      wrappedMoveCardsBatch(selectedCardIds, zone);
      clearSelection();
    } else {
      wrappedMoveCard(card.id, placementMenu.fromZone, zone, index);
    }
    setPlacementMenu(null);
  };

  const execEvolution = () => {
    if (!evolutionRequest || !isMyTurn) return;
    wrappedEvolveCard(evolutionRequest.sourceId, evolutionRequest.targetId);
    setEvolutionRequest(null);
  };

  const execShieldStack = (face: 'up' | 'down') => {
    if (!shieldStackRequest || !isMyTurn) return;
    wrappedEvolveCard(shieldStackRequest.sourceId, shieldStackRequest.targetId, false, face);
    setShieldStackRequest(null);
  };

  const execManaAction = (face: 'up' | 'down') => {
    if (!manaRequest || !isMyTurn) return;
    const { cardIds, fromZone, toZone, fromDeck } = manaRequest;

    if (fromDeck) {
      cardIds.forEach(() => wrappedTopToMana(fromDeck));
    } else {
      if (cardIds.length > 1) {
        wrappedMoveCardsBatch(cardIds, toZone);
        clearSelection();
      } else {
        wrappedMoveCard(cardIds[0], fromZone, toZone);
      }
    }

    cardIds.forEach(id => {
      wrappedToggleFace(id); // Align facing
    });

    setManaRequest(null);
  };

  const moveCardWithViewUpdate = useCallback((cardId: string, from: ZoneName, to: ZoneName, index?: number) => {
    if (!isMyTurn) return;
    wrappedMoveCard(cardId, from, to, index);
    if (viewingZone && viewingZone.cardIds) {
      setViewingZone((prev: any) => prev ? {
        ...prev,
        cardIds: prev.cardIds.filter((id: string) => id !== cardId)
      } : null);
    }
  }, [wrappedMoveCard, viewingZone, isMyTurn]);

  const handleSurrender = () => {
    if (window.confirm("¿Estás seguro de que quieres rendirte?")) {
      sendWsAction(ws, { actionType: "SURRENDER" });
      alert("Te has rendido.");
      onExit();
    }
  };

  const handleNextPhaseLocal = useCallback(() => {
    if (!isMyTurn) {
      showNotification("¡Espera tu turno para avanzar la fase!", "error");
      return;
    }
    wrappedNextPhase();
  }, [isMyTurn, wrappedNextPhase, showNotification]);

  // ── Keyboard Hotkeys ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isMyTurn) return;
      if (e.key === "n" || e.key === "N") handleNextPhaseLocal();
      if (e.key === "d" || e.key === "D") wrappedDrawCards(myRole, 1);
      if (e.key === "u" || e.key === "U") wrappedUntapAll(myRole);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMyTurn, handleNextPhaseLocal, wrappedDrawCards, wrappedUntapAll, myRole]);

  const getCardCenter = useCallback((cardId: string) => {
    const safeId = CSS.escape(cardId);
    const el = document.querySelector(`[data-tracking-anchor="${safeId}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const getPlayerCenter = useCallback((pid: PlayerId) => {
    const el = document.querySelector(`[data-card-id="${pid}_player"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  if (!mounted) return null;

  const topPid: PlayerId = myRole === "p1" ? "p2" : "p1";
  const bottomPid: PlayerId = myRole;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={(e) => {
        setIsOverStackTarget(false);
        setIsOverManaZone(false);
        setIsOverShieldZone(false);
        setIsOverDrawerZone(false);
        setIsOverExtraZone(false);
        handleDragEnd(e);
      }}
      onDragCancel={() => {
        setIsOverStackTarget(false);
        setIsOverManaZone(false);
        setIsOverShieldZone(false);
        setIsOverDrawerZone(false);
        setIsOverExtraZone(false);
        handleDragCancel();
      }}
      onDragOver={(e) => {
        const over = e.over;
        if (!over) {
          setIsOverStackTarget(false);
          setIsOverManaZone(false);
          setIsOverShieldZone(false);
          setIsOverDrawerZone(false);
          setIsOverExtraZone(false);
          return;
        }

        const overId = over.id as string;
        const overZone = over.data?.current?.zone || overId;
        setIsOverManaZone(typeof overZone === 'string' && overZone.includes('manaZone'));
        setIsOverShieldZone(typeof overZone === 'string' && overZone.includes('shields'));
        setIsOverDrawerZone(typeof overZone === 'string' && overZone.includes('drawerZone'));
        setIsOverExtraZone(typeof overZone === 'string' && overZone.includes('extraZone'));

        const isCard = over.data?.current?.isCard;
        const targetCard = over.data?.current?.card as GameCard | undefined;
        if (isCard && targetCard) {
          const targetZone = Object.entries(zones).find(([, ids]) => ids.includes(targetCard.id))?.[0];
          const sourceCard = e.active?.data?.current?.card as GameCard | undefined;
          if (targetZone?.includes('attackZone') && sourceCard && sourceCard.id !== targetCard.id) {
            const sourceZone = Object.entries(zones).find(([, ids]) => ids.includes(sourceCard.id))?.[0];
            const srcType = (sourceCard.typeEn || sourceCard.typeJa || '').toLowerCase();
            const isEvolution = srcType.includes('evolution') || srcType.includes('neo') || srcType.includes('g-neo');
            const isFromDifferentZone = sourceZone !== targetZone;
            setIsOverStackTarget(isEvolution || isFromDifferentZone);
            return;
          }
        }
        setIsOverStackTarget(false);
      }}
    >
      <div className="flex h-screen w-full bg-[#060810] text-slate-400 overflow-hidden font-sans select-none relative">
        <NotificationSystem notification={notification} />
        <CardDisplaySide selectedCard={previewCard} />

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

        {/* Exit / Surrender Options */}
        <div className="absolute top-6 right-6 z-[999] flex gap-3">
          <button
            onClick={handleSurrender}
            className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all backdrop-blur-xl shadow-xl"
          >
            Rendirse
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all backdrop-blur-xl shadow-xl"
          >
            Salir
          </button>
        </div>

        <main
          ref={boardRef}
          className="main-board-area flex-1 h-screen relative overflow-hidden bg-[#060810]"
          onMouseDown={handleMouseDown}
        >
          {/* ═══ TARGETING SVG OVERLAY ═══ */}
          <svg className="fixed inset-0 w-screen h-screen pointer-events-none z-[450]">
            {targetingMode.active && targetingMode.sourceId && targetMousePos && (() => {
              const start = getCardCenter(targetingMode.sourceId);
              if (!start) return null;

              const color = targetingMode.type === 'attack' ? '#ef4444' : targetingMode.type === 'block' ? '#f59e0b' : targetingMode.type === 'evolve' ? '#818cf8' : targetingMode.type === 'stack' ? '#10b981' : '#3b82f6';
              const shadowColor = targetingMode.type === 'attack' ? 'rgba(239, 68, 68, 0.5)' : targetingMode.type === 'block' ? 'rgba(245, 158, 11, 0.5)' : targetingMode.type === 'evolve' ? 'rgba(129, 140, 248, 0.5)' : targetingMode.type === 'stack' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(59, 130, 246, 0.5)';

              return (
                <g>
                  <line
                    x1={start.x} y1={start.y}
                    x2={targetMousePos.x} y2={targetMousePos.y}
                    stroke={color} strokeWidth="4"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }}
                  />
                  <circle cx={targetMousePos.x} cy={targetMousePos.y} r="6" fill={color} style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }} />
                </g>
              );
            })()}

            {combatLinks.map((link, idx) => {
              const start = getCardCenter(link.sourceId);
              const end = (link.targetId === 'p1' || link.targetId === 'p2')
                ? getPlayerCenter(link.targetId as PlayerId)
                : getCardCenter(link.targetId);

              if (!start || !end) return null;

              const color = link.type === 'attack' ? '#ef4444' : link.type === 'block' ? '#f59e0b' : '#3b82f6';
              const shadowColor = link.type === 'attack' ? 'rgba(239, 68, 68, 0.5)' : link.type === 'block' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)';

              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const arrowLength = 15;
              const arrowWidth = Math.PI / 6;

              return (
                <g key={`${link.sourceId}-${link.targetId}-${idx}`}>
                  <line
                    x1={start.x} y1={start.y}
                    x2={end.x} y2={end.y}
                    stroke={color} strokeWidth="4"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }}
                  />
                  <polygon
                    points={`
                      ${end.x},${end.y} 
                      ${end.x - arrowLength * Math.cos(angle - arrowWidth)},${end.y - arrowLength * Math.sin(angle - arrowWidth)} 
                      ${end.x - arrowLength * Math.cos(angle + arrowWidth)},${end.y - arrowLength * Math.sin(angle + arrowWidth)}
                    `}
                    fill={color}
                    style={{ filter: `drop-shadow(0 0 8px ${shadowColor})` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* ═══ 3D ISOMETRIC FIELD ═══ */}
          <div className="field-3d-perspective">
            <div className="field-3d-surface">
              <div className="field-grid-overlay" />
              <div className="field-center-glow" />
              <div className="field-vignette" />

              <AnimatePresence>
                {revolutionChangeEffect && (
                  <RevolutionChangeEffect
                    key={`${revolutionChangeEffect.handCardId}-${revolutionChangeEffect.boardCardId}`}
                    effect={revolutionChangeEffect}
                    onComplete={() => setRevolutionChangeEffect(null)}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {invasionEffect && (
                  <InvasionEffect
                    key={`invasion-${invasionEffect.cardId}`}
                    effect={invasionEffect}
                    onComplete={() => setInvasionEffect(null)}
                  />
                )}
              </AnimatePresence>

              {/* Opponent Player section — glows when it's their turn */}
              <div className={cn(
                "flex-1 h-full min-h-0 relative transition-all duration-500",
                !isMyTurn ? "ring-2 ring-inset ring-purple-500/40 shadow-[inset_0_0_40px_rgba(147,51,234,0.12)]" : "",
              )}>
                <PlayerSection
                  pid={topPid} flipped zones={zones} cards={cards}
                  setViewingZone={setViewingZone} handleCardHover={handleCardHover}
                  handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
                  handleContextMenu={handleContextMenu}
                  handleDeckClick={() => {}}
                  setIsBattleHovered={setIsBattleHovered}
                />
              </div>

              <div className="center-neon-line" />

              {/* My Player section — glows when it's my turn */}
              <div className={cn(
                "flex-1 h-full min-h-0 relative transition-all duration-500",
                isMyTurn ? "ring-2 ring-inset ring-emerald-500/40 shadow-[inset_0_0_40px_rgba(34,197,94,0.10)]" : "",
              )}>
                <PlayerSection
                  pid={bottomPid} zones={zones} cards={cards}
                  setViewingZone={setViewingZone} handleCardHover={handleCardHover}
                  handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
                  handleContextMenu={handleContextMenu}
                  handleDeckClick={(pid) => wrappedDrawCards(pid, 1)}
                  setIsBattleHovered={setIsBattleHovered}
                />
              </div>
            </div>
          </div>

          {/* ─── FLAT UI LAYER (not affected by 3D perspective) ─── */}
          {selectionBox && (
            <div
              className="absolute z-[2000] border border-cyan-400/50 bg-cyan-400/10 pointer-events-none rounded-sm shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-[1px]"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
              }}
            >
              <div className="absolute inset-0 border border-white/10" />
            </div>
          )}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-[500] pointer-events-none">
            <div className="pointer-events-auto">
              <PhaseHud
                currentPhase={currentPhase}
                currentPlayer={currentPlayer}
                nextPhase={handleNextPhaseLocal}
                combatLinksCount={combatLinks.length}
                clearCombatLinks={wrappedClearCombatLinks}
              />
            </div>
          </div>

          {/* Mana Confirmation Modal */}
          <AnimatePresence>
            {manaRequest && (
              <div
                className="absolute inset-0 z-[3000] flex items-center justify-center pointer-events-none"
                style={{
                  perspective: "1100px",
                  perspectiveOrigin: "50% 56%",
                  transformStyle: "preserve-3d"
                }}
              >
                <div
                  className="pointer-events-auto"
                  style={{
                    transform: "rotateX(18deg) scale(0.95)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "center 54%"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 30 }}
                    transition={{ type: "spring", damping: 20, stiffness: 120 }}
                    className="bg-[#090c12]/98 backdrop-blur-2xl border border-emerald-500/50 rounded-xl p-4 shadow-[0_25px_50px_rgba(0,0,0,0.95)] w-[210px] flex flex-col items-center gap-3 text-center relative"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="absolute -left-[108px] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                      <AnimatePresence>
                        {manaRequest.cardIds.length === 1 ? (
                          <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            className="w-[76px] h-[106px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                            style={{ transform: "translateZ(30px)" }}
                          >
                            <Card card={cards[manaRequest.cardIds[0]]} isStatic />
                          </motion.div>
                        ) : (
                          <div className="relative w-[84px] h-[116px]" style={{ transformStyle: "preserve-3d" }}>
                            {manaRequest.cardIds.slice(0, 3).map((id, i) => (
                              <motion.div
                                key={id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{
                                  opacity: 1,
                                  x: i * 6,
                                  y: i * 6,
                                  rotate: i * 2,
                                  zIndex: 10 - i
                                }}
                                className="absolute inset-0 w-[76px] h-[106px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                                style={{ transform: `translateZ(${30 + i * 8}px)` }}
                              >
                                <div className="w-full h-full bg-slate-900 rounded-sm overflow-hidden border border-white/10">
                                  <img src="/deck_new.png" alt="Card Back" className="w-full h-full object-cover" />
                                </div>
                              </motion.div>
                            ))}
                            <div
                              className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20 z-[20]"
                              style={{ transform: "translateZ(65px)" }}
                            >
                              {manaRequest.cardIds.length}
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-center gap-1.5" style={{ transform: "translateZ(15px)" }}>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-0.5">
                        <RefreshCw className="text-emerald-400 w-4 h-4 animate-spin-slow" />
                      </div>
                      <h2 className="text-[11.5px] font-black text-white uppercase tracking-wider italic">
                        Carga de Maná
                      </h2>
                      <p className="text-[7.5px] text-white/40 uppercase font-bold tracking-widest leading-relaxed">
                        ¿Colocar {manaRequest.cardIds.length > 1 ? "cartas" : "carta"}?
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full" style={{ transform: "translateZ(10px)" }}>
                      <button
                        onClick={() => execManaAction('up')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] font-black uppercase tracking-widest rounded-lg border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Face Up (Normal)
                      </button>
                      <button
                        onClick={() => execManaAction('down')}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[8.5px] font-black uppercase tracking-widest rounded-lg border border-white/10 shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Face Down
                      </button>
                      <button
                        onClick={() => setManaRequest(null)}
                        className="w-full py-1 bg-transparent hover:bg-white/5 text-white/30 hover:text-white/50 text-[7.5px] font-black uppercase tracking-widest transition-all mt-0.5 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Evolution Request Modal */}
          <AnimatePresence>
            {evolutionRequest && (
              <div
                className="absolute inset-0 z-[3000] flex items-center justify-center pointer-events-none"
                style={{
                  perspective: "1100px",
                  perspectiveOrigin: "50% 56%",
                  transformStyle: "preserve-3d"
                }}
              >
                <div
                  className="pointer-events-auto"
                  style={{
                    transform: "rotateX(18deg) scale(0.95)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "center 54%"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 30 }}
                    transition={{ type: "spring", damping: 20, stiffness: 120 }}
                    className="bg-[#090c12]/98 backdrop-blur-2xl border border-indigo-500/50 rounded-xl p-4 shadow-[0_25px_50px_rgba(0,0,0,0.95)] w-[210px] flex flex-col items-center gap-3 text-center relative"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="absolute -left-[108px] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, x: 20, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className="w-[76px] h-[106px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                          style={{ transform: "translateZ(30px)" }}
                        >
                          <Card card={cards[evolutionRequest.sourceId]} isStatic />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-center gap-1.5" style={{ transform: "translateZ(15px)" }}>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-0.5">
                        <Layers className="text-indigo-400 w-4 h-4" />
                      </div>
                      <h2 className="text-[11.5px] font-black text-white uppercase tracking-wider italic">
                        Evolución
                      </h2>
                      <p className="text-[7.5px] text-white/40 uppercase font-bold tracking-widest leading-relaxed">
                        ¿Evolucionar la criatura?
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full" style={{ transform: "translateZ(10px)" }}>
                      <button
                        onClick={execEvolution}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[8.5px] font-black uppercase tracking-widest rounded-lg border border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => setEvolutionRequest(null)}
                        className="w-full py-1 bg-transparent hover:bg-white/5 text-white/30 hover:text-white/50 text-[7.5px] font-black uppercase tracking-widest transition-all mt-0.5 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Shield Stack Modal */}
          <AnimatePresence>
            {shieldStackRequest && (
              <div
                className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none"
                style={{ perspective: "1100px" }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/40 pointer-events-auto"
                  onClick={() => setShieldStackRequest(null)}
                />
                <div
                  className="pointer-events-auto"
                  style={{
                    transform: "rotateX(18deg) scale(0.95)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "center 54%"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 30 }}
                    transition={{ type: "spring", damping: 20, stiffness: 120 }}
                    className="bg-[#090c12]/98 backdrop-blur-2xl border border-blue-500/50 rounded-xl p-4 shadow-[0_25px_50px_rgba(0,0,0,0.95)] w-[210px] flex flex-col items-center gap-3 text-center relative"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="absolute -left-[108px] top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, x: 20, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          className="w-[76px] h-[106px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
                          style={{ transform: "translateZ(30px)" }}
                        >
                          <Card card={cards[shieldStackRequest.sourceId]} isStatic />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-center gap-1.5" style={{ transform: "translateZ(15px)" }}>
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-0.5">
                        <Layers className="text-blue-400 w-4 h-4" />
                      </div>
                      <h2 className="text-[11.5px] font-black text-white uppercase tracking-wider italic">
                        Apilar Escudo
                      </h2>
                      <p className="text-[7.5px] text-white/40 uppercase font-bold tracking-widest leading-relaxed">
                        ¿Cómo deseas colocar la carta?
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full" style={{ transform: "translateZ(10px)" }}>
                      <button
                        onClick={() => execShieldStack('down')}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[8.5px] font-black uppercase tracking-widest rounded-lg border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Face Down (Oculto)
                      </button>
                      <button
                        onClick={() => execShieldStack('up')}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[8.5px] font-black uppercase tracking-widest rounded-lg border border-white/10 shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Face Up (Revelado)
                      </button>
                      <button
                        onClick={() => setShieldStackRequest(null)}
                        className="w-full py-1 bg-transparent hover:bg-white/5 text-white/30 hover:text-white/50 text-[7.5px] font-black uppercase tracking-widest transition-all mt-0.5 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Hand overlays */}
          <HandOverlay
            pid={topPid} flipped
            zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu}
          />
          <HandOverlay
            pid={bottomPid} zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu}
          />

          {/* Floating Shields overlay */}
          <div className="absolute inset-0 z-[1500] flex items-center justify-center pointer-events-none">
            <AnimatePresence>
              {floatingShields.map((id, index) => {
                const card = cards[id];
                if (!card) return null;

                const isRevealed = revealedShieldIds.includes(id);
                const isOwner = card.owner === currentPlayer;
                const isPeeking = peekingShieldIds.includes(id);

                let triggerText: string | null = null;
                const checkKeyword = (keywordEn: string, keywordJa: string) => {
                  const descEn = (card.descriptionEn || card.description || '').toLowerCase();
                  const descJa = (card.descriptionJa || '').toLowerCase();
                  const typeEn = (card.typeEn || '').toLowerCase();
                  const typeJa = (card.typeJa || '').toLowerCase();
                  const isTypeMatch = typeEn.includes(keywordEn.toLowerCase()) || typeJa.includes(keywordJa.toLowerCase());
                  const startRegexEn = new RegExp(`(^|[\\n■])\\s*${keywordEn.toLowerCase()}`, 'i');
                  const startRegexJa = new RegExp(`(^|[\\n■])\\s*${keywordJa.toLowerCase()}`, 'i');
                  const isDescMatch = startRegexEn.test(descEn) || startRegexJa.test(descJa);
                  return isTypeMatch || isDescMatch;
                };

                if (checkKeyword('Shield Trigger Plus', 'S・トリガー・プラス')) {
                  triggerText = 'SHIELD TRIGGER PLUS';
                } else if (checkKeyword('Shield Trigger', 'S・トリガー')) {
                  triggerText = 'SHIELD TRIGGER';
                } else if (checkKeyword('Guard Strike', 'G・ストライク')) {
                  triggerText = 'GUARD STRIKE';
                }

                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, scale: 0.5, x: 0, y: 100 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: (index - (floatingShields.length - 1) / 2) * 140,
                      y: [0, -5, 0],
                    }}
                    exit={{
                      opacity: 0,
                      scale: 1.5,
                      filter: "brightness(4) blur(8px)",
                      transition: { duration: 0.3 }
                    }}
                    transition={{
                      opacity: { duration: 0.3 },
                      scale: { type: "spring", damping: 20, stiffness: 100 },
                      x: { type: "spring", damping: 25, stiffness: 100 },
                      y: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: index * 0.4 }
                    }}
                    className="absolute w-[100px] h-[140px] flex items-center justify-center pointer-events-auto cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (card.owner !== myRole) return; // Only peek our own shields
                      setActiveFloatingId(id);
                      setPeekingShieldIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
                    }}
                  >
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 pointer-events-auto">
                      <AnimatePresence>
                        {card.owner === myRole && (
                          <motion.div
                            initial={{ opacity: 0, x: -10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isRevealed) {
                                  setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                  setPeekingShieldIds(prev => prev.includes(id) ? prev : [...prev, id]);
                                } else {
                                  setRevealedShieldIds(prev => [...prev, id]);
                                  setPeekingShieldIds(prev => prev.filter(sid => sid !== id));
                                }
                              }}
                              className={
                                isRevealed
                                  ? "group/btn relative flex items-center justify-center w-8 h-8 rounded-full text-white transition-all hover:scale-110 active:scale-90 border-2 border-yellow-300 bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_0_18px_rgba(250,204,21,0.9),0_0_35px_rgba(250,204,21,0.5)] ring-2 ring-yellow-200/60 animate-pulse"
                                  : "group/btn relative flex items-center justify-center w-8 h-8 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white rounded-full border border-blue-400/50 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all hover:scale-110 active:scale-90"
                              }
                            >
                              <Eye size={14} className={isRevealed ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" : "group-hover/btn:animate-pulse"} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/btn:translate-y-0 z-[300]">
                                <div className={`text-[8px] font-black text-white px-2 py-0.5 rounded shadow-xl uppercase tracking-widest whitespace-nowrap ${isRevealed ? 'bg-yellow-600 border border-yellow-300/60' : 'bg-blue-600 border border-blue-400/50'}`}>
                                  {isRevealed ? 'Hide' : 'Reveal'}
                                </div>
                                <div className={`w-1.5 h-1.5 rotate-45 mx-auto -mt-1 border-r border-b ${isRevealed ? 'bg-yellow-600 border-yellow-300/60' : 'bg-blue-600 border-blue-400/50'}`} />
                              </div>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {card.owner === myRole && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                wrappedMoveCard(id, `${card.owner}_shields` as ZoneName, `${card.owner}_hand` as ZoneName);
                                setFloatingShields(prev => prev.filter(sid => sid !== id));
                                setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                setPeekingShieldIds(prev => prev.filter(sid => sid !== id));
                                setActiveFloatingId(null);
                              }}
                              className="group/btn relative flex items-center justify-center w-8 h-8 bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white rounded-full border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-110 active:scale-90"
                            >
                              <Hand size={14} className="group-hover/btn:translate-y-[-1px] transition-transform" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/btn:translate-y-0 z-[300]">
                                <div className="bg-slate-800 text-[8px] font-black text-white px-2 py-0.5 rounded shadow-xl border border-white/20 uppercase tracking-widest whitespace-nowrap">
                                  To Hand
                                </div>
                                <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-white/20" />
                              </div>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {card.owner === myRole && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFloatingShields(prev => prev.filter(sid => sid !== id));
                                setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                setPeekingShieldIds(prev => prev.filter(sid => sid !== id));
                                setActiveFloatingId(null);
                              }}
                              className="group/btn relative flex items-center justify-center w-8 h-8 bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-full border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.55)] transition-all hover:scale-110 active:scale-90"
                            >
                              <CornerUpLeft size={14} className="group-hover/btn:translate-y-[-1px] transition-transform" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover/btn:translate-y-0 z-[300]">
                                <div className="bg-cyan-800 text-[8px] font-black text-white px-2 py-0.5 rounded shadow-xl border border-cyan-400/40 uppercase tracking-widest whitespace-nowrap">
                                  Return
                                </div>
                                <div className="w-1.5 h-1.5 bg-cyan-800 rotate-45 mx-auto -mt-1 border-r border-b border-cyan-400/40" />
                              </div>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <motion.div
                      className="absolute inset-0 pointer-events-none z-[100]"
                      initial={{ opacity: 0 }}
                      exit={{ opacity: 1 }}
                    >
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                          exit={{
                            x: (Math.random() - 0.5) * 250,
                            y: (Math.random() - 0.5) * 250,
                            rotate: Math.random() * 720,
                            scale: 0,
                            opacity: 0
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-100/40 backdrop-blur-sm border border-white/30 shadow-[0_0_15px_white]"
                          style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 80%)" }}
                        />
                      ))}
                    </motion.div>

                    <motion.div
                      className="relative w-full h-full"
                      style={{ transformStyle: "preserve-3d" }}
                      animate={{ rotateY: (isRevealed || isPeeking) ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", damping: 15, stiffness: 100 }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="absolute inset-0 bg-blue-500/10 blur-[50px] rounded-full animate-pulse" />
                        <div className="relative w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
                          <img
                            src="/shield_frame.png"
                            alt="Shield"
                            className="w-full h-full object-fill filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] brightness-110"
                          />
                          <div className="absolute inset-4 border border-blue-400/30 rounded-[1rem] shadow-[inset_0_0_15px_rgba(59,130,246,0.3)] animate-pulse flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-400/20 blur-xl rounded-full animate-ping" />
                          </div>

                          {card.owner === myRole && !isPeeking && !isRevealed && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[50]">
                              <motion.div
                                className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-blue-400/40 rounded-full px-2 py-0.5 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                              >
                                <Eye size={8} className="text-blue-300" />
                                <span className="text-[6.5px] font-black text-blue-200 uppercase tracking-wider whitespace-nowrap">
                                  Click to View
                                </span>
                              </motion.div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        <div className="w-full h-full scale-[0.8] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] pointer-events-auto relative">
                          {card && (
                            <div className="relative w-full h-full">
                              <Card
                                card={{ ...card, face: 'up' }}
                                isStatic
                                onHover={(c) => handleCardHover(c)}
                                onLeave={() => handleCardHover(null)}
                              />

                              {isRevealed && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                      opacity: [0, 1, 0],
                                      scale: [0.8, 1.3, 1.5],
                                      filter: ["brightness(1) blur(0px)", "brightness(2) blur(10px)", "brightness(1) blur(20px)"]
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute inset-0 z-[100] bg-yellow-400 rounded-sm pointer-events-none mix-blend-screen"
                                  />
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{
                                      opacity: [0.4, 0.7, 0.4],
                                      scale: [1.02, 1.08, 1.02],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -inset-6 z-[-1] bg-gradient-to-r from-yellow-600/40 via-yellow-400/20 to-yellow-600/40 blur-3xl rounded-full pointer-events-none"
                                  />
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{
                                      opacity: [0.6, 1, 0.6],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -inset-[2px] z-[50] border-2 border-yellow-400 rounded-sm pointer-events-none shadow-[0_0_15px_rgba(250,204,21,0.6),inset_0_0_10px_rgba(250,204,21,0.4)]"
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

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
            toggleTapped={(id) => {
              if (selectedCardIds.includes(id)) wrappedToggleTappedBatch(selectedCardIds);
              else wrappedToggleTapped(id);
            }}
            toggleFace={(id) => {
              if (selectedCardIds.includes(id)) wrappedToggleFaceBatch(selectedCardIds);
              else wrappedToggleFace(id);
            }}
            cycleFace={wrappedCycleFace}
            setViewingZone={setViewingZone}
            moveCard={moveCardWithViewUpdate}
            startTargeting={startTargeting}
            currentPlayer={currentPlayer}
            viewingZone={viewingZone}
            cards={cards}
            onManaRequest={(cardIds, fromZone, toZone) => setManaRequest({ cardIds, fromZone, toZone })}
          />

          <PlacementMenu
            placementMenu={placementMenu} setPlacementMenu={setPlacementMenu}
            cards={cards}
            toggleTapped={(id) => {
              if (selectedCardIds.includes(id)) wrappedToggleTappedBatch(selectedCardIds);
              else wrappedToggleTapped(id);
            }}
            cycleFace={(id) => {
              if (selectedCardIds.includes(id)) wrappedCycleFaceBatch(selectedCardIds);
              else wrappedCycleFace(id);
            }}
            handlePlaceCard={handlePlaceCard} menuRef={menuRef}
            startTargeting={startTargeting}
            onSendTo={handleSendTo}
            toggleFace={(id) => {
              if (selectedCardIds.includes(id)) wrappedToggleFaceBatch(selectedCardIds);
              else wrappedToggleFace(id);
            }}
          />

          <ViewModal
            viewingZone={viewingZone} setViewingZone={setViewingZone}
            zones={zones} cards={cards} currentPlayer={myRole}
            handleCardHover={handleCardHover}
            handleCardClick={handleCardClick}
            handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleStackWindowContextMenu}
            setPreviewCard={setPreviewCard}
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
        </main>
      </div>
    </DndContext>
  );
}
