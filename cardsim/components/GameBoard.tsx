"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragOverlay, pointerWithin, rectIntersection, MeasuringStrategy, useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import { useGameStore, GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { Card } from "./Card";
import { Zap, Eye, Hand, Layers, X, ChevronRight, RefreshCw, CornerUpLeft } from "lucide-react";

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
import { GZoneWidget } from "./GZoneWidget";
import { HyperspatialWidget } from "./HyperspatialWidget";
import { ResourceArea } from "./ResourceArea";


// New Hooks
import { useGameHotkeys } from "../lib/useGameHotkeys";
import { useGameDnD } from "../lib/useGameDnD";
import { cn } from "../lib/utils";

const TrackingTriggerEffect = ({ effect }: { effect: { type: string, name: string, id: string, targetZone?: string } }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId: number;
    let hasFoundCard = false;

    const track = () => {
      if (ref.current) {
        // Use CSS.escape to handle IDs that contain quotes or special characters
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
      {/* ─── BASE EFFECT (Anchored to the Card) ─── */}
      <div className="absolute bottom-1/2 translate-y-1/2 z-0 pointer-events-none flex items-center justify-center">
        {/* Flash */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-20 h-20 bg-yellow-200 rounded-full blur-2xl"
        />

        {/* Energy Ring 1 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.8, opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute w-16 h-16 rounded-full border-2 border-yellow-400 shadow-[0_0_15px_#facc15]"
        />

        {/* Energy Ring 2 */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 2.2, opacity: [0, 0.7, 0] }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
          className="absolute w-16 h-16 rounded-full border border-yellow-500 shadow-[0_0_20px_#eab308]"
        />

        {/* Sparks */}
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

      {/* ─── BEAM EFFECT ─── */}
      <motion.div
        initial={{ height: 0, opacity: 0, scaleX: 0.2 }}
        animate={{ height: 100, opacity: [0, 1, 0], scaleX: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute bottom-1/2 translate-y-1/2 w-16 bg-gradient-to-t from-yellow-400/90 via-yellow-200/40 to-transparent blur-md origin-bottom"
      />

      {/* ─── FLOATING BADGE ─── */}
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
      {/* ─── Core Impact Shockwave ─── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 2, 3],
          opacity: [0, 0.8, 0],
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute w-24 h-24 bg-white rounded-full blur-xl mix-blend-screen"
      />

      {/* ─── Outer Energy Rings ─── */}
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
          style={{ borderStyle: 'dashed' }}
        />
      ))}

      {/* ─── Chromatic Burst ─── */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
        transition={{ duration: 0.7 }}
        className="absolute w-24 h-24 bg-gradient-to-r from-red-600 via-indigo-600 to-purple-600 rounded-full blur-2xl"
      />

      {/* ─── Fragment Particles ─── */}
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

      {/* ─── Dramatic Text Reveal ─── */}
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
          {/* Text Background Glow */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-lg scale-110 animate-pulse" />

          <span className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,1)] uppercase tracking-[0.15em]">
            Revolution Change
          </span>

          {/* Subtitle */}
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

      {/* ─── Flare Flash ─── */}
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
      {/* ─── Core Impact Shockwave ─── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 4, 7],
          opacity: [0, 0.9, 0],
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute w-24 h-24 bg-red-400 rounded-full blur-[30px] mix-blend-screen"
      />

      {/* ─── Outer Fire Rings ─── */}
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
          style={{ borderStyle: 'dashed' }}
        />
      ))}

      {/* ─── Chromatic Burst (Fire) ─── */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 6], opacity: [1, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute w-32 h-32 bg-gradient-to-r from-red-700 via-orange-500 to-yellow-400 rounded-full blur-3xl"
      />

      {/* ─── Fragment Particles (Sparks) ─── */}
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

      {/* ─── Dramatic Text Reveal ─── */}
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
          {/* Text Background Glow */}
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

          {/* Subtitle */}
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

      {/* ─── Flare Flash ─── */}
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
      {/* Background Energy Flash */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 3], opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute w-48 h-48 bg-indigo-500/30 rounded-full blur-[40px]"
      />

      <div className="relative flex flex-col items-center">
        {/* Main Text Container */}
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
            style={{
              textShadow: "0 0 10px #818cf8, 0 0 20px #6366f1"
            }}
          >
            EVOLUTION
          </h1>
        </motion.div>
      </div>
    </motion.div>
  );
};


export function GameBoard({ onExit, p1Deck, p2Deck }: { onExit: () => void, p1Deck?: any[], p2Deck?: any[] }) {
  const {
    cards, zones, initializeGame, moveCard, drawCards, shuffleDeck,
    toggleTapped, toggleFace, cycleFace, currentPhase, currentPlayer, nextPhase,
    topToMana, topToShield, topToGraveyard, untapAll,
    selectedCardIds, toggleTappedBatch, toggleFaceBatch, moveCardsBatch, clearSelection, setSelection,
    toggleSelection, cycleFaceBatch,
    targetingMode, startTargeting, cancelTargeting, confirmTarget, combatLinks, clearCombatLinks,
    evolveCard,
    floatingShields, setFloatingShields, revealedShieldIds, setRevealedShieldIds, peekingShieldIds, setPeekingShieldIds,
    activeTriggerEffect, setActiveTriggerEffect,
    revolutionChangeEffect, setRevolutionChangeEffect, execRevolutionChange,
    invasionEffect, setInvasionEffect,
    inspectedStackCardId, setInspectedStackCardId,
    endTurn
  } = useGameStore();

  // ─── Tracking Helpers ──────────────────────────────────────────────────────
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
  const [targetMousePos, setTargetMousePos] = useState<{ x: number, y: number } | null>(null);

  // Input states for DeckMenu
  const [drawAmt, setDrawAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [manaAmt, setManaAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [graveAmt, setGraveAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [lookAmt, setLookAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [revealAmt, setRevealAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const [shieldAmt, setShieldAmt] = useState<Record<PlayerId, number>>({ p1: 0, p2: 0 });
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

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const menuRef = useRef<HTMLDivElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const showNotification = useCallback((msg: string, type: 'error' | 'info' = 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Custom Collision Detection to prioritize specific slots (extraZone, drawerZone) over massive zones (attackZone)
  const customCollisionDetection = useCallback((args: any) => {
    // 1. Get pointer collisions first
    let collisions = pointerWithin(args);

    // 2. If no pointer collisions, use rect intersection fallback
    if (collisions.length === 0) {
      collisions = rectIntersection(args);
    }

    // 3. ALWAYS prioritize extraZone and drawerZone in all collisions to prevent massive zones from hijacking drops
    if (collisions.length > 0) {
      const extraZoneCollision = collisions.find(c => c.id.toString().includes('extraZone'));
      if (extraZoneCollision) return [extraZoneCollision];

      const drawerZoneCollision = collisions.find(c => c.id.toString().includes('drawerZone'));
      if (drawerZoneCollision) return [drawerZoneCollision];
    }

    return collisions;
  }, []);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    initializeGame(p1Deck, p2Deck);
  }, [initializeGame, p1Deck, p2Deck]);

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
    zones, moveCard,
    showNotification, setActiveCard, setPreviewCard,
    previewTimerRef: previewTimer,
    selectedCardIds, moveCardsBatch, clearSelection,
    onEvolveRequest: (sourceId, targetId, fromZone, toZone) => setEvolutionRequest({ sourceId, targetId, fromZone, toZone }),
    onShieldStackRequest: (sourceId, targetId, fromZone, toZone) => setShieldStackRequest({ sourceId, targetId, fromZone, toZone }),
    onManaRequest: (cardIds, fromZone, toZone) => setManaRequest({ cardIds, fromZone, toZone })
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeCard) {
      setFloatingShields([]);
      setRevealedShieldIds([]);
    }
  }, [activeCard]);

  const handleCardHover = useCallback((card: GameCard | null, zone?: ZoneName) => {
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
      if (targetingMode.type === 'evolve' && targetingMode.sourceId) {
        // Evolve → open the evolution/stack confirmation modal
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
        // Stack → directly confirm; no modal needed
        confirmTarget(card.id);
        cancelTargeting();
      } else {
        confirmTarget(card.id);
      }
      setTargetMousePos(null);
      return;
    }

    // Set preview card on click
    if (card.face === 'up') {
      setPreviewCard(card);
    }

    // Detect if shield click
    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }

    if (zone?.includes('shields')) {
      if (floatingShields.includes(card.id)) {
        setFloatingShields(prev => prev.filter(id => id !== card.id));
      } else {
        setFloatingShields(prev => [...prev.slice(-4), card.id]); // Keep last 5
      }
      return;
    }

    // Un simple click ahora selecciona la carta
    toggleSelection(card.id);
  }, [isDragging, toggleSelection, targetingMode.active, confirmTarget, zones, floatingShields]);

  const handleCardDoubleClick = useCallback((card: GameCard) => {
    if (isDragging.current) return;
    let zone: ZoneName | undefined;
    for (const [z, ids] of Object.entries(zones)) {
      if ((ids as string[]).includes(card.id)) { zone = z as ZoneName; break; }
    }
    if (!zone) return;

    if (zone.includes("hand")) {
      const toZone = `${card.owner}_attackZone_back` as ZoneName;
      if (selectedCardIds.includes(card.id)) {
        moveCardsBatch(selectedCardIds, toZone);
        clearSelection();
      } else {
        moveCard(card.id, zone, toZone);
      }
    } else if (zone.includes("attackZone") || zone.includes("manaZone")) {
      if (selectedCardIds.includes(card.id)) {
        toggleTappedBatch(selectedCardIds);
      } else {
        toggleTapped(card.id);
      }
    } else if (zone.includes("shields")) {
      if (selectedCardIds.includes(card.id)) {
        toggleFaceBatch(selectedCardIds);
      } else {
        toggleFace(card.id);
      }
    }
  }, [isDragging, zones, toggleTapped, toggleTappedBatch, selectedCardIds, moveCard, moveCardsBatch, clearSelection, toggleFace, toggleFaceBatch]);




  // ─── Multi-Selection Logic (Rubber Band) ────────────────────────────────────
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
          // Exclude shields from mass selection to prevent accidental "BROKEN" states
          if (id && zone && !zone.includes('shields')) {
            newlySelectedIds.push(id);
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
  }, [selectionBox, setSelection]);

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
      // If clicked on an empty space while targeting, cancel it
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
          confirmTarget(id);
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
  }, [clearSelection, targetingMode.active]);

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

  const handleContextMenu = useCallback((e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    e.preventDefault();

    if (targetingMode.active) {
      cancelTargeting();
      return;
    }

    // If the card is inside an open view modal, ALWAYS show the ContextMenu (not deck or placement menu)
    const isInsideViewModal = viewingZone && viewingZone.zone === zone;
    if (isInsideViewModal) {
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
      return;
    }

    // Only show DeckMenu when clicking the physical deck pile on the board
    if (zone.includes("mainDeck")) {
      setDeckMenu({ pid: card.owner, x: e.clientX, y: e.clientY });
      return;
    }

    // For hand, battlezone, manazone: open the placement menu
    if (zone.includes("hand") || zone.includes("attackZone") || zone.includes("manaZone")) {
      setPlacementMenu({ card, fromZone: zone, x: e.clientX, y: e.clientY });
    } else {
      // For other zones (shields, graveyard, etc): open the standard context menu
      setContextMenu({ card, zone, x: e.clientX, y: e.clientY });
    }
  }, [targetingMode, viewingZone, cancelTargeting, setContextMenu, setDeckMenu, setPlacementMenu]);

  const handleStackWindowContextMenu = useCallback((e: React.MouseEvent, card: GameCard, zone: ZoneName) => {
    e.preventDefault();
    setPlacementMenu({ card, fromZone: zone, x: e.clientX, y: e.clientY, isStackWindow: true });
  }, [setPlacementMenu]);



  const handlePlaceCard = useCallback((toZone: ZoneName) => {
    if (!placementMenu) return;
    const { id } = placementMenu.card;
    const cardIds = selectedCardIds.includes(id) ? selectedCardIds : [id];

    if (toZone.includes("manaZone")) {
      setManaRequest({ cardIds, fromZone: placementMenu.fromZone, toZone });
      setPlacementMenu(null);
      return;
    }

    if (selectedCardIds.includes(id)) {
      moveCardsBatch(selectedCardIds, toZone);
      clearSelection();
    } else {
      moveCard(id, placementMenu.fromZone, toZone);
    }
    setPlacementMenu(null);
  }, [placementMenu, moveCard, moveCardsBatch, selectedCardIds, clearSelection]);

  // Deck Action Executors
  const execDraw = (pid: PlayerId) => {
    drawCards(pid, drawAmt[pid] || 1);
    setDrawAmt(p => ({ ...p, [pid]: 0 }));
    setDeckMenu(null);
  };
  const execMana = (pid: PlayerId) => {
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
    let zone: ZoneName = `${card.owner}_cemetery` as ZoneName;
    let index: number | undefined;
    if (target === 'deckTop') { zone = `${card.owner}_mainDeck` as ZoneName; index = 0; }
    if (target === 'deckBottom') zone = `${card.owner}_mainDeck` as ZoneName;
    if (target === 'hyperspatial') zone = `${card.owner}_hyperspatial` as ZoneName;
    if (target === 'gZone') zone = `${card.owner}_gZone` as ZoneName;
    if (target === 'banishZone') zone = `${card.owner}_banishZone` as ZoneName;

    if (selectedCardIds.includes(card.id)) {
      moveCardsBatch(selectedCardIds, zone);
      clearSelection();
    } else {
      moveCard(card.id, placementMenu.fromZone, zone, index);
    }
    setPlacementMenu(null);
  };

  const execEvolution = () => {
    if (!evolutionRequest) return;
    evolveCard(evolutionRequest.sourceId, evolutionRequest.targetId);
    setEvolutionRequest(null);
  };

  const execShieldStack = (face: 'up' | 'down') => {
    if (!shieldStackRequest) return;
    evolveCard(shieldStackRequest.sourceId, shieldStackRequest.targetId, false, face);
    setShieldStackRequest(null);
  };

  const execManaAction = (face: 'up' | 'down') => {
    if (!manaRequest) return;
    const { cardIds, fromZone, toZone, fromDeck } = manaRequest;

    // Perform move
    if (fromDeck) {
      // Special logic for topToMana batch
      cardIds.forEach(() => topToMana(fromDeck));
    } else {
      if (cardIds.length > 1) {
        moveCardsBatch(cardIds, toZone);
        clearSelection();
      } else {
        moveCard(cardIds[0], fromZone, toZone);
      }
    }

    // Set face for all moved cards
    const currentCards = useGameStore.getState().cards;
    cardIds.forEach(id => {
      const currentFace = currentCards[id].face;
      if (currentFace !== face) {
        toggleFace(id);
      }
    });

    setManaRequest(null);
  };

  const moveCardWithViewUpdate = useCallback((cardId: string, from: ZoneName, to: ZoneName, index?: number) => {
    moveCard(cardId, from, to, index);
    if (viewingZone && viewingZone.cardIds) {
      setViewingZone((prev: any) => prev ? {
        ...prev,
        cardIds: prev.cardIds.filter((id: string) => id !== cardId)
      } : null);
    }
  }, [moveCard, viewingZone, setViewingZone]);

  if (!mounted) return null;

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
      onDragCancel={(e) => {
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

        // Check if hovering over a card (not a zone) in the battle zone
        const isCard = over.data?.current?.isCard;
        const targetCard = over.data?.current?.card as GameCard | undefined;
        if (isCard && targetCard) {
          // Find which zone the target card is in
          const targetZone = Object.entries(zones).find(([, ids]) => ids.includes(targetCard.id))?.[0];
          const sourceCard = e.active?.data?.current?.card as GameCard | undefined;
          if (targetZone?.includes('attackZone') && sourceCard && sourceCard.id !== targetCard.id) {
            const sourceZone = Object.entries(zones).find(([, ids]) => ids.includes(sourceCard.id))?.[0];
            const srcType = (sourceCard.typeEn || sourceCard.typeJa || (sourceCard as any).type_en || (sourceCard as any).type_ja || '').toLowerCase();
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

        {/* Exit / Surrender Options */}
        <div className="absolute top-6 right-6 z-[999] flex gap-3">
          <button
            onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres rendirte?")) {
                alert("Te has rendido.");
                onExit();
              }
            }}
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
            {/* Draw active targeting arrow */}
            {targetingMode.active && targetingMode.sourceId && targetMousePos && (() => {
              const start = getCardCenter(targetingMode.sourceId);
              if (!start) return null;

              // Color based on type
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

            {/* Draw confirmed combat links */}
            {combatLinks.map((link, idx) => {
              const start = getCardCenter(link.sourceId);
              const end = (link.targetId === 'p1' || link.targetId === 'p2')
                ? getPlayerCenter(link.targetId as PlayerId)
                : getCardCenter(link.targetId);

              if (!start || !end) return null;

              const color = link.type === 'attack' ? '#ef4444' : link.type === 'block' ? '#f59e0b' : '#3b82f6';
              const shadowColor = link.type === 'attack' ? 'rgba(239, 68, 68, 0.5)' : link.type === 'block' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)';

              // Calculate angle to draw arrowhead
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
                  {/* Arrowhead */}
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
              {/* Field Decorations */}
              <div className="field-grid-overlay" />
              <div className="field-center-glow" />
              <div className="field-vignette" />

              {/* ═══ Revolution Change Effect (Inside 3D) ═══ */}
              <AnimatePresence>
                {revolutionChangeEffect && (
                  <RevolutionChangeEffect
                    key={`${revolutionChangeEffect.handCardId}-${revolutionChangeEffect.boardCardId}`}
                    effect={revolutionChangeEffect}
                    onComplete={() => setRevolutionChangeEffect(null)}
                  />
                )}
              </AnimatePresence>

              {/* ═══ Invasion Effect (Inside 3D) ═══ */}
              <AnimatePresence>
                {invasionEffect && (
                  <InvasionEffect
                    key={`invasion-${invasionEffect.cardId}`}
                    effect={invasionEffect}
                    onComplete={() => setInvasionEffect(null)}
                  />
                )}
              </AnimatePresence>



              {/* Opponent (P2) — top half, further away in perspective */}
              <PlayerSection
                pid="p2" flipped zones={zones} cards={cards}
                setViewingZone={setViewingZone} handleCardHover={handleCardHover}
                handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
                handleContextMenu={handleContextMenu}
                handleDeckClick={(pid) => drawCards(pid, 1)}
                setIsBattleHovered={setIsBattleHovered}
              />

              {/* Center Neon Divider */}
              <div className="center-neon-line" />

              {/* Player (P1) — bottom half, closer in perspective */}
              <PlayerSection
                pid="p1" zones={zones} cards={cards}
                setViewingZone={setViewingZone} handleCardHover={handleCardHover}
                handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
                handleContextMenu={handleContextMenu}
                handleDeckClick={(pid) => drawCards(pid, 1)}
                setIsBattleHovered={setIsBattleHovered}
              />
            </div>
          </div>

          {/* ═══ FLAT UI LAYER (not affected by 3D perspective) ═══ */}

          {/* Selection Box Visual */}
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
                nextPhase={nextPhase}
                combatLinksCount={combatLinks.length}
                clearCombatLinks={clearCombatLinks}
              />
            </div>
          </div>

          {/* Mana Confirmation Modal with 3D Holographic Perspective (Flat Layer, Overlaying PhaseHud) */}
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
                {/* 3D Perspective Wrapper */}
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
                    {/* Floating Card Previews */}
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

          {/* ─── Shield Stack Modal ─── */}
          <AnimatePresence>
            {mounted && shieldStackRequest && (
              <div
                className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none"
                style={{ perspective: "1100px" }}
              >
                {/* Subtle background dimming */}
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
                    {/* Floating Card Previews */}
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



          {/* Hand Overlays — flat, not affected by perspective */}
          <HandOverlay
            pid="p2" flipped zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu}
          />

          <HandOverlay
            pid="p1" zones={zones} cards={cards} activeCard={activeCard}
            hoveredHand={hoveredHand} setHoveredHand={setHoveredHand}
            placementMenu={placementMenu} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu}
          />


          {/* Floating Shields Overlay (Multiple) - Now inside main battlefield */}
          <div className="absolute inset-0 z-[1500] flex items-center justify-center pointer-events-none">
            <AnimatePresence>
              {floatingShields.map((id, index) => {
                const card = cards[id];
                if (!card) return null;

                const isRevealed = revealedShieldIds.includes(id);
                const isOwner = card.owner === currentPlayer;
                const isOpponent = !isOwner;
                const isPeeking = peekingShieldIds.includes(id);

                let triggerText: string | null = null;

                const checkKeyword = (keywordEn: string, keywordJa: string) => {
                  const descEn = (card.descriptionEn || card.description || '').toLowerCase();
                  const descJa = (card.descriptionJa || '').toLowerCase();
                  const typeEn = (card.typeEn || '').toLowerCase();
                  const typeJa = (card.typeJa || '').toLowerCase();

                  // Precise check: Must be in type definition OR at the start of a line in the description
                  const isTypeMatch = typeEn.includes(keywordEn.toLowerCase()) || typeJa.includes(keywordJa.toLowerCase());

                  // Regex to match at start of string or after a newline/bullet point
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
                      x: (index - (floatingShields.length - 1) / 2) * 140, // Centered row logic
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
                      setActiveFloatingId(id);
                      // Toggle private peeking
                      setPeekingShieldIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
                    }}
                  >
                    {/* Bottom Action Buttons Group — owner only */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 pointer-events-auto">
                      <AnimatePresence>
                        {isOwner && (
                          <motion.div
                            initial={{ opacity: 0, x: -10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isRevealed) {
                                  // Stop showing to opponents, but owner keeps peeking privately
                                  setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                  setPeekingShieldIds(prev => prev.includes(id) ? prev : [...prev, id]);
                                } else {
                                  // Reveal to all, clear private peek
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

                              {/* Tooltip */}
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
                        {isOwner && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (card) {
                                  moveCard(id, `${card.owner}_shields` as ZoneName, `${card.owner}_hand` as ZoneName);
                                  setFloatingShields(prev => prev.filter(sid => sid !== id));
                                  setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                  setPeekingShieldIds(prev => prev.filter(sid => sid !== id));
                                  setActiveFloatingId(null);
                                }
                              }}
                              className="group/btn relative flex items-center justify-center w-8 h-8 bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white rounded-full border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:scale-110 active:scale-90"
                            >
                              <Hand size={14} className="group-hover/btn:translate-y-[-1px] transition-transform" />

                              {/* Tooltip */}
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

                      {/* Return to Shield Zone Button */}
                      <AnimatePresence>
                        {isOwner && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.8 }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // The card is still in the shields zone; just clear UI overlay state.
                                setFloatingShields(prev => prev.filter(sid => sid !== id));
                                setRevealedShieldIds(prev => prev.filter(sid => sid !== id));
                                setPeekingShieldIds(prev => prev.filter(sid => sid !== id));
                                setActiveFloatingId(null);
                              }}
                              className="group/btn relative flex items-center justify-center w-8 h-8 bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-full border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.55)] transition-all hover:scale-110 active:scale-90"
                            >
                              <CornerUpLeft size={14} className="group-hover/btn:translate-y-[-1px] transition-transform" />

                              {/* Tooltip */}
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

                    {/* Break Fragments (Visible only on exit) */}
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

                    {/* 3D Flip Container */}
                    <motion.div
                      className="relative w-full h-full"
                      style={{ transformStyle: "preserve-3d" }}
                      animate={{ rotateY: (isRevealed || isPeeking) ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", damping: 15, stiffness: 100 }}
                    >
                      {/* Front: Shield Frame */}
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

                          {/* "Click to View" badge — only for owner, only before peeking */}
                          {isOwner && !isPeeking && !isRevealed && (
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

                      {/* Back: The Actual Card */}
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

                              {/* Revelation Effect: Flash and Aura */}
                              {isRevealed && (
                                <>
                                  {/* Initial Burst Flash */}
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

                                  {/* Persistent Divine Aura */}
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{
                                      opacity: [0.4, 0.7, 0.4],
                                      scale: [1.02, 1.08, 1.02],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute -inset-6 z-[-1] bg-gradient-to-r from-yellow-600/40 via-yellow-400/20 to-yellow-600/40 blur-3xl rounded-full pointer-events-none"
                                  />

                                  {/* Luminous Yellow Border */}
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

                              {/* Fog of War: If peeking but NOT revealed, hide from opponent */}
                              {!isRevealed && isPeeking && isOpponent && (
                                <div className="absolute inset-0 z-[10] bg-slate-900 rounded-sm flex flex-col items-center justify-center border border-white/10">
                                  <div className="bg-slate-800/80 p-2 rounded-full mb-2">
                                    <Eye size={20} className="text-slate-500" />
                                  </div>
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center px-4">
                                    Hidden from you
                                  </span>
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
                                </div>
                              )}


                              {/* Shield Trigger Overlay */}
                              {triggerText && (
                                <>
                                  <div className="absolute inset-0 z-50 pointer-events-none rounded-sm ring-4 ring-yellow-400 animate-pulse shadow-[inset_0_0_20px_rgba(250,204,21,0.5)] flex items-center justify-center">
                                    <div className="bg-black/90 text-yellow-400 font-black text-[12px] sm:text-[14px] px-2 py-1 sm:px-4 sm:py-2 rounded-lg border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.8)] whitespace-nowrap transform -rotate-12 backdrop-blur-md">
                                      {triggerText}
                                    </div>
                                  </div>

                                  {/* ACTIVATE Button */}
                                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-[60]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // prevent flipping or dismissing

                                        // Trigger visual effect
                                        if (triggerText) {
                                          const cardId = card.id;
                                          const typeText = triggerText;
                                          const nameText = card.name;
                                          const toZone = `${card.owner}_attackZone_back`;

                                          setActiveTriggerEffect({
                                            type: typeText,
                                            name: nameText,
                                            id: cardId,
                                            targetZone: toZone
                                          });
                                          setTimeout(() => setActiveTriggerEffect(null), 3000);
                                        }

                                        const toZone = `${card.owner}_attackZone_back`;
                                        moveCard(card.id, `${card.owner}_shields` as ZoneName, toZone as ZoneName);

                                        // Cleanup floating states
                                        setFloatingShields(prev => prev.filter(sid => sid !== card.id));
                                        setRevealedShieldIds(prev => prev.filter(sid => sid !== card.id));
                                        setPeekingShieldIds(prev => prev.filter(sid => sid !== card.id));
                                        setActiveFloatingId(null);
                                      }}
                                      className="bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 text-black font-black uppercase text-[12px] px-6 py-2 rounded-full shadow-[0_5px_15px_rgba(234,179,8,0.6)] border border-yellow-200 transition-all hover:scale-110 active:scale-95 pointer-events-auto flex items-center gap-2"
                                    >
                                      <Zap className="w-4 h-4 fill-black" />
                                      ACTIVATE
                                    </button>
                                  </div>
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

          {/* Evolve / Stack Confirmation Modal */}
          <AnimatePresence>
            {evolutionRequest && cards[evolutionRequest.sourceId] && (
              <div className="absolute inset-0 z-[3000] flex items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] w-[200px] flex flex-col items-center gap-3 text-center pointer-events-auto"
                >
                  {(() => {
                    const source = cards[evolutionRequest.sourceId];
                    const type = (source.typeEn || source.typeJa || (source as any).type_en || (source as any).type_ja || "").toLowerCase();
                    const isEvolution = type.includes("evolution") || type.includes("neo") || type.includes("g-neo");

                    return (
                      <>
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 mb-1">
                            {isEvolution ? <Zap className="text-indigo-400 w-4 h-4 fill-current" /> : <Layers className="text-emerald-400 w-4 h-4" />}
                          </div>
                          <h2 className="text-[14px] font-black text-white uppercase tracking-wider italic">
                            Acción de Campo
                          </h2>
                          <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest">
                            Selecciona cómo colocar la carta
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full mt-1">
                          {isEvolution && (
                            <button
                              onClick={() => {
                                const pos = getCardCenter(evolutionRequest.targetId);
                                evolveCard(evolutionRequest.sourceId, evolutionRequest.targetId);
                                if (pos) setEvolutionEffectPos(pos);
                                setEvolutionRequest(null);
                              }}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-400/50 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 group"
                            >
                              <Zap size={14} className="fill-current group-hover:scale-125 transition-transform" />
                              Evolve?
                            </button>
                          )}

                          <button
                            onClick={() => {
                              evolveCard(evolutionRequest.sourceId, evolutionRequest.targetId, true);
                              setEvolutionRequest(null);
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 group"
                          >
                            <Layers size={14} className="group-hover:scale-125 transition-transform" />
                            Colocar debajo?
                          </button>

                          <button
                            onClick={() => setEvolutionRequest(null)}
                            className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all mt-1"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Mana Confirmation Modal has been moved to 3D Field Perspective */}
          <ViewModal
            viewingZone={viewingZone} setViewingZone={setViewingZone} zones={zones} cards={cards}
            currentPlayer={currentPlayer} handleCardHover={handleCardHover}
            handleCardClick={handleCardClick} handleCardDoubleClick={handleCardDoubleClick}
            handleContextMenu={handleContextMenu}
            setPreviewCard={setPreviewCard}
          />
        </main>

        <DragOverlay dropAnimation={{ duration: 150 }} zIndex={10000}>
          {activeCard ? (
            <div
              style={{
                transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease',
                transform: (() => {
                  const isShield = zones.p1_shields.includes(activeCard.id) || zones.p2_shields.includes(activeCard.id);
                  if (isOverStackTarget) return 'scale(0.72)';
                  if (isOverManaZone) return 'scale(0.6)';
                  if (isOverShieldZone) return isShield ? 'scale(1.1)' : 'scale(0.32)'; // 0.32 perfectly matches the 32x44px shield size
                  if (isOverDrawerZone) return 'scale(0.67)';
                  if (isOverExtraZone) return 'scale(0.85)';
                  return 'scale(1)';
                })(),
                opacity: (isOverStackTarget || isOverManaZone || isOverShieldZone || isOverDrawerZone || isOverExtraZone) ? 0.85 : 1,
                transformOrigin: 'center center',
              }}
            >
              {(() => {
                const isShield = zones.p1_shields.includes(activeCard.id) || zones.p2_shields.includes(activeCard.id);
                if (isShield) {
                  return (
                    <div className="relative w-8 h-11 flex items-center justify-center scale-110">
                      <div className="absolute inset-0 rounded-[4px] border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8),inset_0_0_10px_rgba(59,130,246,0.6)]" />
                      <img
                        src="/shield_frame.png"
                        alt="Shield Icon"
                        className="absolute inset-0 w-full h-full object-fill drop-shadow-[0_15px_25px_rgba(0,0,0,0.9)] brightness-125"
                      />
                    </div>
                  );
                }
                return <Card card={activeCard} isOverlay />;
              })()}
            </div>
          ) : null}
        </DragOverlay>

        <AnimatePresence>
          {activeTriggerEffect && <TrackingTriggerEffect key={activeTriggerEffect.id} effect={activeTriggerEffect as any} />}
        </AnimatePresence>

        <AnimatePresence>
          {evolutionEffectPos && (
            <EvolutionEffect
              key="evolution-dramatic-banner"
              x={evolutionEffectPos.x}
              y={evolutionEffectPos.y}
              onComplete={() => setEvolutionEffectPos(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mounted && inspectedStackCardId && cards[inspectedStackCardId] && (() => {
            const realZone = (() => {
              for (const [z, ids] of Object.entries(zones)) {
                if ((ids as string[]).includes(inspectedStackCardId)) return z as ZoneName;
              }
              return `${cards[inspectedStackCardId].owner}_attackZone_front` as ZoneName;
            })();

            return (
              <div
                className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none"
                style={{ perspective: "1100px" }}
              >
                {/* Subtle background dimming - only in the center area */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/40 pointer-events-auto"
                  onClick={() => setInspectedStackCardId(null)}
                />

                <div
                  className="pointer-events-auto"
                  style={{
                    transform: "rotateX(18deg) scale(0.95)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "center center"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-4 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_0_15px_rgba(99,102,241,0.1)] max-w-[95vw] w-fit flex flex-col gap-3 group/modal"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* HUD Decorative Corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-indigo-500/30 rounded-tl-[1.5rem] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-indigo-500/30 rounded-br-[1.5rem] pointer-events-none" />

                    {/* Header with Scanner Detail */}
                    <div className="flex justify-between items-start gap-6 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute -inset-1 bg-indigo-500/20 blur-md rounded-lg animate-pulse" />
                          <div className="relative p-1.5 bg-indigo-600/10 rounded-lg border border-indigo-500/30">
                            <Layers size={14} className="text-indigo-400" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-ping" />
                            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-indigo-400/80">Neural Scan</span>
                          </div>
                          <h2 className="text-sm font-black text-white tracking-tight">
                            {cards[inspectedStackCardId].nameEn || cards[inspectedStackCardId].name}
                          </h2>
                        </div>
                      </div>
                      <button
                        onClick={() => setInspectedStackCardId(null)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer border border-white/5 group/close"
                      >
                        <X size={16} className="group-hover/close:rotate-90 transition-transform duration-300" />
                      </button>
                    </div>

                    {/* Stack Visualization */}
                    <div className="flex flex-row items-center gap-4 overflow-x-auto py-4 px-2 custom-scrollbar-thin max-w-full">
                      {/* Top card - The Active Layer */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="relative">
                          <div className="absolute -inset-4 bg-indigo-500/10 blur-2xl rounded-full opacity-50" />
                          <div className="relative flex flex-col items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[7px] font-black uppercase tracking-widest">
                              Surface
                            </span>
                            <div className="w-24 shadow-2xl rounded-lg overflow-hidden ring-1 ring-indigo-500/50 transition-all">
                              <Card
                                card={{ ...cards[inspectedStackCardId], position: 'vertical' }}
                                isStatic
                                zone={realZone}
                                aspectRatio="aspect-[3/4]"
                                onHover={(hoveredCard) => handleCardHover(hoveredCard)}
                                onLeave={() => handleCardHover(null)}
                                onContextMenu={handleStackWindowContextMenu}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Layers underneath - Reversed to show from top to bottom */}
                      {[...(cards[inspectedStackCardId].underlyingCards || [])].reverse().map((cid, idx) => {
                        const c = cards[cid];
                        if (!c) return null;
                        return (
                          <React.Fragment key={cid}>
                            <div className="flex flex-col items-center opacity-20 shrink-0">
                              <ChevronRight className="text-indigo-400" size={16} strokeWidth={3} />
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 text-[7px] font-black uppercase tracking-widest">
                                Layer {idx + 1}
                              </span>
                              <div className="w-20 shadow-xl rounded-md overflow-hidden ring-1 ring-white/10 opacity-60 hover:opacity-100 hover:ring-indigo-500/30 transition-all duration-500 hover:scale-105">
                                <Card
                                  card={{ ...c, position: 'vertical' }}
                                  isStatic
                                  zone={realZone}
                                  aspectRatio="aspect-[3/4]"
                                  onHover={(hoveredCard) => handleCardHover(hoveredCard)}
                                  onLeave={() => handleCardHover(null)}
                                  onContextMenu={handleStackWindowContextMenu}
                                />
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Status Bar */}
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[7px] text-white/20 font-black uppercase tracking-[0.2em]">
                          {cards[inspectedStackCardId].underlyingCards?.length || 0} Layers detected
                        </p>
                      </div>
                      <div className="text-[6px] font-bold text-indigo-500/40 uppercase tracking-widest">
                        Interface Nominal
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* ═══ GLOBAL OVERLAYS (Root Level Stacking) ═══ */}
        <ContextMenu
          contextMenu={contextMenu} setContextMenu={setContextMenu}
          toggleTapped={(id) => {
            if (selectedCardIds.includes(id)) toggleTappedBatch(selectedCardIds);
            else toggleTapped(id);
          }}
          toggleFace={(id) => {
            if (selectedCardIds.includes(id)) toggleFaceBatch(selectedCardIds);
            else toggleFace(id);
          }}
          cycleFace={cycleFace}
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
            if (selectedCardIds.includes(id)) toggleTappedBatch(selectedCardIds);
            else toggleTapped(id);
          }}
          cycleFace={(id) => {
            if (selectedCardIds.includes(id)) cycleFaceBatch(selectedCardIds);
            else cycleFace(id);
          }}
          handlePlaceCard={handlePlaceCard} menuRef={menuRef}
          startTargeting={startTargeting}
          onSendTo={handleSendTo}
          toggleFace={(id) => {
            if (selectedCardIds.includes(id)) toggleFaceBatch(selectedCardIds);
            else toggleFace(id);
          }}
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
