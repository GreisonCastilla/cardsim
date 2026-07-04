"use client";

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GameCard, ZoneName, useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import { Shield, Sword, RotateCw, Zap, ChevronRight, Sparkles, X, Layers } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { parseRevolutionChangeRequirement, isEligibleForRevolutionChange } from '../lib/revolutionChange';
import { parseInvasionRequirement, isEligibleForInvasion } from '../lib/invasion';
import { analyzeSummoningSickness } from '../lib/summoningSickness';

interface CardProps {
  card: GameCard;
  zone?: ZoneName;
  isOverlay?: boolean;
  isStatic?: boolean;
  onHover?: (card: GameCard) => void;
  onLeave?: () => void;
  onClick?: (card: GameCard, event: React.MouseEvent) => void;
  onDoubleClick?: (card: GameCard, event: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  aspectRatio?: string;
}

export function Card({ card, zone, isOverlay, isStatic, onHover, onLeave, onClick, onDoubleClick, onContextMenu, aspectRatio = "aspect-[3/4]" }: CardProps) {
  const {
    cards, zones, draggingCardId, startTargeting, toggleTapped, activeTriggerEffect,
    combatLinks, execRevolutionChange, evolveCard, currentPlayer, targetingMode,
    setInvasionEffect, summonedThisTurn, activatingEffect, pingCardEffect,
    setInspectedStackCardId
  } = useGameStore();

  const draggingCard = draggingCardId ? cards[draggingCardId] : null;
  const { t } = useLanguage();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const dragId = isStatic || isOverlay ? `${card.id}-preview` : card.id;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { card, fromZone: zone },
    disabled: isStatic || isOverlay,
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: card.id,
    data: { card, isCard: true },
    disabled: isStatic || isOverlay || isDragging,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = transform && !isDragging ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleMouseEnter = () => {
    if (onHover && !isDragging) onHover(card);
  };

  const isFacedown = card.face === 'down';
  const isTapped = card.position === 'horizontal';
  const isMano = zone?.includes('hand');

  const currentFace = card.activeFaceIndex && card.backs && card.activeFaceIndex > 0
    ? card.backs[card.activeFaceIndex - 1]
    : null;

  const displayImage = currentFace ? (currentFace.preferredImageUrl || currentFace.image_url) : (card.preferredImageUrl || card.image);
  const displayName = currentFace ? currentFace.name : (card.nameEn || card.name);

  const shadowClass = isDragging
    ? "shadow-[0_20px_40px_rgba(0,0,0,0.8)] scale-110"
    : isMano
      ? "shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
      : "shadow-[0_4px_8px_rgba(0,0,0,0.4)]";

  const isSelected = useGameStore(s => s.selectedCardIds.includes(card.id));

  const [showEvolutionEffect, setShowEvolutionEffect] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const prevUnderlyingCount = React.useRef(-1);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Summoning Sickness ───────────────────────────────────────────────
  // A card is "fresh" if it entered the battle zone THIS turn.
  // We run the keyword analysis to determine what kind of attack (if any) it can do.
  const isBattleZone = zone?.includes('attackZone');
  const isFreshOnField = isBattleZone && summonedThisTurn.has(card.id);
  const sicknessInfo = React.useMemo(
    () => isFreshOnField ? analyzeSummoningSickness(card) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isFreshOnField, card.id, card.descriptionEn, card.descriptionJa, card.typeEn, card.typeJa]
  );
  // Can the card declare an attack this turn?
  // - If NOT fresh on field → always yes (normal attack rules apply)
  // - If fresh → only if the keyword allows attacking the player ('full') or creatures ('creatures','tapped_only','untapped_only')
  const canDeclareAttack = !isFreshOnField || (sicknessInfo ? !sicknessInfo.hasSickness : true);

  React.useEffect(() => {
    const _isBattleZoneEffect = zone?.includes('attackZone');
    const currentCount = card.underlyingCards?.length || 0;

    // Trigger if:
    // 1. It's an evolution (underlying cards increased)
    // 2. It's a card entering the Battle Zone for the first time
    if ((currentCount > 0 && currentCount > prevUnderlyingCount.current) || (_isBattleZoneEffect && prevUnderlyingCount.current === -1)) {
      setShowEvolutionEffect(true);
      const timer = setTimeout(() => setShowEvolutionEffect(false), 1200);
      return () => clearTimeout(timer);
    }
    prevUnderlyingCount.current = currentCount;
  }, [card.underlyingCards?.length, zone]);

  // ─── Revolution Change: find valid attacker ───
  const rcValidAttacker = React.useMemo(() => {
    const isMecanicaZone = zone?.includes('hand') || zone?.includes('hyperspatial') || zone?.includes('gZone');
    if (!isMecanicaZone || isFacedown || card.owner !== currentPlayer) return null;

    // Must be actively attacking (combatLink) AFTER selecting a target
    const isAttacking = combatLinks.some(l => l.type === 'attack');
    if (!isAttacking) return null;

    const requirement = parseRevolutionChangeRequirement(card);
    if (!requirement) return null;

    // Check confirmed combat links first
    const activeLink = combatLinks.find(link => {
      const attacker = cards[link.sourceId];
      return link.type === 'attack' && attacker && attacker.owner === card.owner && isEligibleForRevolutionChange(attacker, requirement);
    });

    if (activeLink) return activeLink.sourceId;

    return null;
  }, [zone, isFacedown, card, currentPlayer, combatLinks, cards]);

  // ─── Invasion: find valid attacker ───
  const invValidAttacker = React.useMemo(() => {
    if (isFacedown || card.owner !== currentPlayer) return null;

    // Must be actively attacking (combatLink) AFTER selecting a target
    const isAttacking = combatLinks.some(l => l.type === 'attack');
    if (!isAttacking) return null;

    const requirement = parseInvasionRequirement(card);
    if (!requirement) return null;

    // Check if the card is in an allowed zone for its invasion type
    const isMecanicaZone = requirement.allowedZones.some(z => zone?.includes(z));
    if (!isMecanicaZone) return null;

    // Check confirmed combat links first
    const activeLink = combatLinks.find(link => {
      const attacker = cards[link.sourceId];
      return link.type === 'attack' && attacker && attacker.owner === card.owner && isEligibleForInvasion(attacker, requirement);
    });

    if (activeLink) return activeLink.sourceId;

    return null;
  }, [zone, isFacedown, card, currentPlayer, combatLinks, cards]);

  return (
    <div
      className={cn("card-element relative w-full h-full group/card pointer-events-auto cursor-pointer overflow-visible")}
      onClick={(e) => onClick && onClick(card, e)}
      onDoubleClick={(e) => onDoubleClick && onDoubleClick(card, e)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, card, zone || ("" as ZoneName));
        }
      }}
      data-card-id={card.id}
      data-card-zone={zone}
    >

      {/* Hover Extender Bridge (Top) — always pointer-events-auto + cursor-pointer; transparent so no click-blocking */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[120%] h-8 bg-transparent pointer-events-auto cursor-pointer z-[1900]" />
      {/* Hover Extender Bridge (Bottom) */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[120%] h-6 bg-transparent pointer-events-auto cursor-pointer z-[1900]" />

      {/* ─── Activate Effect Visual (Ping) ─── */}
      <AnimatePresence mode="wait">
        {activatingEffect?.cardId === card.id && (
          <motion.div
            key={`effect-ping-${activatingEffect.ts}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[600] pointer-events-none flex items-center justify-center overflow-visible"
          >
            {/* Expanding outer ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 1, boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)' }}
              animate={{
                scale: [1, 1.3, 1.6],
                opacity: [1, 0.7, 0],
                boxShadow: ['0 0 10px 5px rgba(168, 85, 247, 0.8)', '0 0 25px 12px rgba(168, 85, 247, 0.6)', '0 0 40px 20px rgba(168, 85, 247, 0)']
              }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="absolute inset-0 rounded-sm border-2 border-purple-400"
            />
            {/* Inner flash */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-purple-500 rounded-sm mix-blend-screen"
            />
            {/* Dramatic Text Reveal */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
              animate={{
                y: [-10, -35],
                opacity: [0, 1, 1, 0],
                scale: [0.8, 1.1, 1.1, 1],
                filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(5px)']
              }}
              transition={{ duration: 1.4, times: [0, 0.2, 0.8, 1] }}
              className="absolute flex flex-col items-center pointer-events-none z-[10000]"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-purple-600/40 blur-lg scale-125 animate-pulse" />
                <span className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-600 drop-shadow-[0_0_15px_rgba(168,85,247,1)] uppercase tracking-[0.15em] whitespace-nowrap">
                  EFFECT
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Ring */}
      {isSelected && (
        <div className="absolute -inset-2 z-[-1] rounded-lg bg-cyan-400/20 blur-md border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.4)] animate-pulse pointer-events-none" />
      )}

      {/* ─── Stack Target Visual Indicator (Drag or Targeting) ─── */}
      {(() => {
        if (!zone?.includes('attackZone')) return null;
        if (targetingMode.sourceId === card.id) return null;

        let shouldShow = (targetingMode.active && targetingMode.type === 'stack');

        if (isOver && draggingCard) {
          const type = (draggingCard.typeEn || draggingCard.typeJa || (draggingCard as any).type_en || (draggingCard as any).type_ja || "").toLowerCase();
          const isEvolution = type.includes("evolution") || type.includes("neo") || type.includes("g-neo");

          // Find source zone of draggingCard
          let sourceZone: string | undefined;
          for (const [z, ids] of Object.entries(zones)) {
            if ((ids as string[]).includes(draggingCard.id)) { sourceZone = z; break; }
          }

          const isFromDifferentZone = sourceZone !== zone;
          if (isEvolution || isFromDifferentZone) {
            shouldShow = true;
          }
        }

        if (!shouldShow) return null;

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "absolute -inset-2 z-[100] pointer-events-none border-2 rounded-lg flex items-end justify-center pb-4 transition-all",
              isOver ? "border-emerald-500 bg-emerald-500/20" : "border-emerald-500/30 group-hover/card:border-emerald-500 group-hover/card:bg-emerald-500/10"
            )}
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent transition-opacity",
              isOver ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"
            )} />
            <div className="relative bg-emerald-600 text-white text-[8px] font-black uppercase tracking-tighter px-3 py-1 rounded-md shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-2">
              <Layers size={10} />
              Colocar debajo
            </div>
          </motion.div>
        );
      })()}

      {/* ─── Summoning Sickness Orbital Effect ─── */}
      {/* Pure CSS animations — runs on GPU compositor, zero JS per-frame */}
      <AnimatePresence>
        {isFreshOnField && sicknessInfo?.hasSickness && (
          <motion.div
            key="sickness-orbit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 pointer-events-none z-[70] overflow-visible"
          >
            {/* Rim glow — CSS pulse, no JS */}
            <div className="sickness-rim absolute -inset-[1px] rounded-sm border border-yellow-300/40 shadow-[0_0_6px_2px_rgba(253,224,71,0.25)] pointer-events-none" />

            {/* Orbit wheel — CSS spin, no JS */}
            <div
              className="sickness-orbit-wheel absolute inset-0 pointer-events-none"
              style={{ transformOrigin: 'center center' }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angleDeg = i * 60;
                const isBig = i % 2 === 0;
                const rad = (angleDeg * Math.PI) / 180;
                const rx = 51;
                const ry = 51;
                const x = 50 + rx * Math.sin(rad);
                const y = 50 - ry * Math.cos(rad);
                const glyph = isBig ? '★' : '✦';
                return (
                  <span
                    key={i}
                    className="sickness-star"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      fontSize: isBig ? '11px' : '8px',
                      color: isBig ? '#fde047' : '#fbbf24',
                      textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,' + (isBig ? '0 0 5px rgba(253,224,71,0.9)' : '0 0 3px rgba(251,191,36,0.8)'),
                      fontStyle: 'normal',
                      // stagger each star so they appear pre-distributed on mount
                      animationDelay: `-${i * (3.6 / 6)}s`,
                    }}
                  >
                    {glyph}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-face Badge */}
      {card.backs && card.backs.length > 0 && !isFacedown && (
        <div className="absolute -bottom-1 -right-1 z-[60] bg-blue-600 text-white text-[6px] md:text-[8px] font-bold px-1 rounded-full shadow-lg border border-blue-400 pointer-events-none">
          {(card.activeFaceIndex || 0) + 1}/{card.backs.length + 1}
        </div>
      )}

      {/* Evolution Stack Badge */}
      {card.underlyingCards && card.underlyingCards.length > 0 && !isFacedown && !isStatic && (
        <div className="absolute -top-1 -right-1 z-[60] bg-indigo-600 text-white text-[6px] md:text-[8px] font-bold px-1 rounded-full shadow-lg border border-indigo-400 pointer-events-none">
          +{card.underlyingCards.length}
        </div>
      )}

      {/* Stack Visual Effect */}
      {card.underlyingCards && card.underlyingCards.length > 0 && !isFacedown && !isStatic && (
        <>
          <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] bg-slate-900/40 rounded-sm z-[-1] border border-white/10 cursor-pointer" />
          <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] bg-slate-900/20 rounded-sm z-[-2] border border-white/5 cursor-pointer" />
        </>
      )}





      {/* Main Card */}
      <motion.div
        ref={setNodeRef}
        style={{ ...style, cursor: isDragging ? 'grabbing' : 'pointer' }}
        {...(isStatic ? {} : listeners)}
        {...(isStatic ? {} : attributes)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => onLeave && onLeave()}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, card, zone || 'unknown' as ZoneName);
          }
        }}
        animate={{
          scale: showEvolutionEffect ? [1, 1.05, 1] : 1,
          rotate: showEvolutionEffect ? [0, -1, 1, 0] : undefined,
          x: activatingEffect?.cardId === card.id ? [0, -5, 5, -4, 4, -2, 2, 0] : 0
        }}
        transition={activatingEffect?.cardId === card.id ? { duration: 0.6, ease: "easeInOut" } : { duration: 0.4 }}
        className={cn(
          "peer relative transition-all duration-200 ease-out pointer-events-auto",
          isDragging ? "cursor-grabbing" : "cursor-pointer active:cursor-grabbing",
          "ring-1 ring-white/20 hover:ring-white/40 shadow-[0_0_10px_rgba(255,255,255,0.05)]",
          !isStatic && "",
          "w-full h-full shrink-0 rounded-sm",
          aspectRatio,
          shadowClass,
          isDragging && "opacity-50 z-50",
          isOverlay && "opacity-100 z-[1000] scale-105 pointer-events-none ring-1 ring-white/30",
          isOver && "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(255,255,0,0.5)]",
          isSelected && "ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)] z-40",
          isFacedown ? "bg-slate-900" : "bg-slate-800",
          isTapped
            ? "rotate-90 origin-center"
            : (zone?.includes('manaZone') ? "rotate-180" : "")
        )}
      >
        {/* Evolution Effect Overlay (Inside motion.div to follow transforms) */}
        <AnimatePresence>
          {showEvolutionEffect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[500] pointer-events-none"
            >
              {/* Flash */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.8, opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 bg-white rounded-lg blur-2xl"
              />

              {/* Energy Ring 1 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, border: "2px solid #818cf8" }}
                animate={{ scale: 2.2, opacity: [0, 1, 0] }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 rounded-lg shadow-[0_0_10px_#818cf8] cursor-pointer"
              />

              {/* Energy Ring 2 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0, border: "1px solid #4f46e5" }}
                animate={{ scale: 2.5, opacity: [0, 0.7, 0] }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
                className="absolute inset-0 rounded-lg shadow-[0_0_15px_#4f46e5] cursor-pointer"
              />

              {/* Particles / Sparks */}
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: (Math.random() - 0.5) * 120,
                    y: (Math.random() - 0.5) * 120,
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0]
                  }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: Math.random() * 0.2 }}
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-indigo-300 rounded-full shadow-[0_0_8px_#818cf8] cursor-pointer"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {!isFacedown ? (
          <div className="relative h-full w-full select-none rounded-sm group/img pointer-events-none">
            <div className="w-full h-full flex items-center justify-center overflow-visible relative pointer-events-none">
              {displayImage ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-slate-700/50 animate-pulse rounded-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    </div>
                  )}
                  <img
                    src={displayImage}
                    alt={displayName}
                    className={cn(
                      "object-contain w-full h-full rounded-sm transition-opacity duration-300 pointer-events-none",
                      imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    draggable={false}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <Shield size={16} className="text-slate-600 opacity-30 pointer-events-none" />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative select-none rounded-sm pointer-events-none">
            <img
              src={(card.backs && card.backs.length > 0)
                ? (card.backs[0].preferredImageUrl || card.backs[0].image_url)
                : "/deck_new.png"}
              alt="Card Back"
              className="object-cover w-full h-full rounded-sm pointer-events-none"
              draggable={false}
              loading="lazy"
            />
          </div>
        )}
      </motion.div>

      {/* ─── Hover Action HUD (Battle Zone) ─── */}
      {zone?.includes('attackZone') && !isFacedown && !isDragging && !isOverlay && !isStatic && (
        <div className={cn(
          "absolute -top-5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 transition-all duration-200 z-[2000] pb-1 px-4 cursor-pointer",
          activatingEffect?.cardId === card.id
            ? "!opacity-0 !scale-90 !pointer-events-none"
            : (isSelected ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto")
        )}>
          {/* Attack button — hidden when creature has summoning sickness on entry */}
          {card.position === 'vertical' && canDeclareAttack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startTargeting(card.id, 'attack');
                toggleTapped(card.id);
              }}
              className={cn(
                "w-4 h-4 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
              )}
              title="Declare Attack"
            >
              <Sword size={9} className="drop-shadow-md pointer-events-none" />
            </button>
          )}

          {/* Summoning Sickness indicator — shown when the card can't attack at all this turn */}
          {card.position === 'vertical' && isFreshOnField && sicknessInfo?.hasSickness && (
            <div
              title={`Summoning sickness — cannot attack this turn`}
              className="w-4 h-4 rounded-full bg-slate-700/90 border border-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.6)] flex items-center justify-center text-slate-400 pointer-events-auto cursor-pointer"
            >
              <Zap size={8} className="opacity-40 pointer-events-none" />
            </div>
          )}

          {card.position === 'vertical' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startTargeting(card.id, 'block');
                toggleTapped(card.id);
              }}
              className={cn(
                "w-4 h-4 rounded-full bg-amber-600/90 hover:bg-amber-500 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
              )}
              title="Declare Block"
            >
              <Shield size={8} className="drop-shadow-md pointer-events-none" />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); toggleTapped(card.id); }}
            className={cn(
              "w-4 h-4 rounded-full bg-blue-600/90 hover:bg-blue-500 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
            )}
            title={card.position === 'vertical' ? "Tap" : "Untap"}
          >
            <RotateCw size={8} className={card.position === 'horizontal' ? "-rotate-90 transition-transform drop-shadow-md pointer-events-none" : "transition-transform drop-shadow-md pointer-events-none"} />
          </button>
        </div>
      )}

      {/* ─── Hover Action HUD Bottom (Effect) ─── */}
      {zone?.includes('attackZone') && !isFacedown && !isDragging && !isOverlay && !isStatic && (
        <div className={cn(
          "absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 transition-all duration-200 z-[2000] pt-1 px-4 cursor-pointer",
          activatingEffect?.cardId === card.id
            ? "!opacity-0 !scale-90 !pointer-events-none"
            : (isSelected ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto")
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              pingCardEffect(card.id);
            }}
            className={cn(
              "w-4 h-4 rounded-full bg-purple-600/90 hover:bg-purple-500 border border-purple-400 shadow-[0_0_8px_rgba(147,51,234,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
            )}
            title="Activar Efecto"
          >
            <Sparkles size={8} className="drop-shadow-md pointer-events-none" />
          </button>

          {card.underlyingCards && card.underlyingCards.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInspectedStackCardId(card.id);
              }}
              className={cn(
                "w-4 h-4 rounded-full bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400 shadow-[0_0_8px_rgba(79,70,229,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
              )}
              title="Ver Stack de Evolución"
            >
              <Layers size={8} className="drop-shadow-md pointer-events-none" />
            </button>
          )}
        </div>
      )}

      {/* ─── Hand/Special Action HUD (Evolution + Revolution Change) ─── */}
      {/* We allow this HUD in hand, hyperspatial, gZone, OR if the card has a valid invasion target (e.g. from cemetery) */}
      {(!isFacedown && !isDragging && !isOverlay && !isStatic && (
        zone?.includes('hand') || zone?.includes('hyperspatial') || zone?.includes('gZone') || invValidAttacker
      )) && (
          <div className={cn(
            "absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 transition-all duration-200 z-[2000] pb-1 px-4 cursor-pointer",
            activatingEffect?.cardId === card.id
              ? "!opacity-0 !scale-90 !pointer-events-none"
              : ((isSelected || rcValidAttacker || invValidAttacker) ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto")
          )}>
            {/* Evolution Button */}
            {(() => {
              const cardType = (card.typeEn || card.typeJa || (card as any).type_en || (card as any).type_ja || "").toLowerCase();
              const isEvolution = cardType.includes("evolution") || cardType.includes("evolución") || cardType.includes("進化") || cardType.includes("neo") || cardType.includes("g-neo");
              // Evolution only from hand usually, and hide it if INVADE is available to avoid clutter
              return isEvolution && zone?.includes('hand') && !invValidAttacker && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startTargeting(card.id, 'evolve');
                  }}
                  className="w-6 h-6 rounded-full bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.8)] flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-white/40 pointer-events-auto"
                  title="Evolve"
                >
                  <img src="/evolve_icon.webp" alt="Evolve" className="w-4 h-4 object-contain drop-shadow-md pointer-events-none" />
                </button>
              );
            })()}

            {/* Revolution Change Button */}
            {rcValidAttacker && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  execRevolutionChange(card.id, rcValidAttacker);
                }}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/50 shadow-[0_0_12px_rgba(147,51,234,0.7)] text-white font-black text-[8px] uppercase tracking-widest transition-all hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto flex items-center gap-1.5"
                title="Revolution Change"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                CHANGE
              </button>
            )}

            {/* Invasion Button */}
            {invValidAttacker && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Invasion places the card on top of the attacker (Evolve)
                  evolveCard(card.id, invValidAttacker);
                  setInvasionEffect({ cardId: card.id });
                }}
                className="w-7 h-7 rounded-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border border-red-400/50 shadow-[0_0_12px_rgba(220,38,38,0.7)] text-white transition-all hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto flex items-center justify-center overflow-hidden"
                title="Invasion"
              >
                <img src="/invasion_icon.png" alt="Invasion" className="w-[110%] h-[110%] object-contain drop-shadow-md pointer-events-none" />
              </button>
            )}
          </div>
        )}


      {/* ═══ 2D Tracking Anchor ═══ */}
      {/* This 1x1 pixel anchor perfectly translates the 3D rotated visual center to a 2D screen coordinate */}
      <div
        data-tracking-anchor={card.id}
        data-tracking-zone={zone}
        className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none"
      />

    </div>
  );
}
