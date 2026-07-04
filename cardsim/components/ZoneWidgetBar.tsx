"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { DroppableZone } from "./DroppableZone";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";

/**
 * ZoneWidgetBar — DM PLAY'S style compact zone indicators.
 * 
 * Each zone (Mana, Graveyard, Hyperspatial, Deck, GR, Banish) is a compact
 * pill-shaped widget. The pill IS the DroppableZone, so drag-and-drop works.
 * Clicking opens the ViewModal for full card inspection.
 * Mana shows colored civilization dots for at-a-glance resource tracking.
 */

interface ZoneWidgetBarProps {
  pid: PlayerId;
  flipped: boolean;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  setViewingZone: (state: any) => void;
}

const CIV_COLORS: Record<string, string> = {
  Fire: '#ef4444', '火': '#ef4444',
  Water: '#3b82f6', '水': '#3b82f6',
  Nature: '#22c55e', '自然': '#22c55e',
  Light: '#eab308', '光': '#eab308',
  Darkness: '#a855f7', '闇': '#a855f7', Dark: '#a855f7',
};

function getCivColor(card: GameCard): string {
  const civ = card.civilization || card.color || '';
  const first = civ.split('/')[0]?.trim();
  return CIV_COLORS[first] || '#64748b';
}

/** Single zone widget pill — wraps DroppableZone around the visual pill */
function ZonePill({
  zoneKey,
  label,
  icon,
  colorClass,
  hoverBorder,
  hoverGlow,
  count,
  onView,
  children,
}: {
  zoneKey: ZoneName;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  hoverBorder: string;
  hoverGlow: string;
  count: number;
  onView: () => void;
  children?: React.ReactNode;
}) {
  return (
    <DroppableZone
      id={zoneKey}
      title=""
      label=""
      className={cn(
        "!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl",
        "hover:!border-opacity-100 transition-all duration-300",
        hoverBorder
      )}
      style={{ minWidth: 'auto', minHeight: 'auto' }}
      count={count}
      onView={onView}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onView(); }}
        className={cn(
          "group flex items-center gap-2 px-3 py-2 transition-all duration-300",
          "active:scale-95 w-full"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
          colorClass
        )}>
          {icon}
        </div>

        {/* Label + Count */}
        <div className="flex flex-col items-start leading-none">
          <span className={cn("text-[10px] font-black tracking-wider uppercase", colorClass.replace('bg-', 'text-').replace('/20', '').replace('/30', ''))}>{label}</span>
          <span className="text-base font-black text-white">{count}</span>
        </div>

        {/* Extra content (civ dots for mana) */}
        {children}
      </button>
    </DroppableZone>
  );
}

export function ZoneWidgetBar({ pid, flipped, zones, cards, setViewingZone }: ZoneWidgetBarProps) {
  const manaKey = `${pid}_manaZone` as ZoneName;
  const cemeteryKey = `${pid}_cemetery` as ZoneName;
  const hyperspatialKey = `${pid}_hyperspatial` as ZoneName;
  const deckKey = `${pid}_mainDeck` as ZoneName;
  const banishKey = `${pid}_banishZone` as ZoneName;
  const gZoneKey = `${pid}_gZone` as ZoneName;

  const manaCivs = useMemo(() => {
    const manaIds = zones[manaKey] || [];
    return manaIds.map(id => {
      const card = cards[id];
      return {
        id,
        color: getCivColor(card),
        tapped: card?.position === 'horizontal',
      };
    });
  }, [zones, cards, manaKey]);

  const manaUntapped = manaCivs.filter(m => !m.tapped).length;
  const manaTotal = manaCivs.length;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[900] flex items-end justify-between px-4 pb-1.5 pointer-events-none">
      {/* LEFT: Mana Plays-style Widget */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto flex items-end ml-4"
      >
        <DroppableZone
          id={manaKey}
          title=""
          label=""
          className="!bg-transparent !border-none !shadow-none !overflow-visible"
          style={{ minWidth: 'auto', minHeight: 'auto' }}
          count={manaTotal}
          manaCards={zones[manaKey]}
          cardsData={cards}
          onView={() => setViewingZone({ zone: manaKey, mode: "full" })}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: manaKey, mode: "full" }); }}
            className="relative group w-28 h-28 flex items-center justify-center active:scale-95 transition-all"
          >
            {/* Satellite Civ Dots (Orbital pattern - spread more clearly) */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {manaCivs.slice(0, 12).map((m, i) => {
                // Orbital distribution: starts from top-left and goes around the top
                const angle = (i * 30) - 160; 
                const radius = 50;
                const x = Math.cos(angle * (Math.PI / 180)) * radius;
                const y = Math.sin(angle * (Math.PI / 180)) * radius;
                
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "absolute w-3.5 h-3.5 rounded-full border-2 transition-all duration-500",
                      m.tapped ? "opacity-20 scale-75 blur-[1px]" : "opacity-100 shadow-[0_0_8px_currentColor]"
                    )}
                    style={{
                      left: `calc(50% + ${x}px - 7px)`,
                      top: `calc(50% + ${y}px - 7px)`,
                      backgroundColor: m.color,
                      color: m.color,
                      borderColor: 'rgba(0,0,0,0.5)',
                      zIndex: 20
                    }}
                  />
                );
              })}
            </div>

            {/* Main Orb Body */}
            <div className="relative w-16 h-16 rounded-full bg-[#1a1c23] border-[3px] border-[#2a2d3a] shadow-2xl flex items-center justify-center overflow-hidden">
              {/* Inner Glow Ring */}
              <div className="absolute inset-[2px] rounded-full border border-cyan-500/30 animate-pulse" />
              
              {/* Core Glow */}
              <div className={cn(
                "absolute inset-[4px] rounded-full transition-all duration-700",
                manaUntapped > 0 
                  ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 opacity-90 shadow-[inset_0_0_15px_rgba(0,0,0,0.6),0_0_25px_rgba(245,158,11,0.4)]"
                  : "bg-slate-800 opacity-50"
              )} />

              {/* Glass Reflection */}
              <div className="absolute top-[10%] left-[20%] w-[40%] h-[20%] bg-white/20 rounded-full blur-[2px] rotate-[-20deg]" />

              {/* Text Container */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none italic">
                  {manaUntapped}
                </span>
                <div className="w-8 h-px bg-white/20 my-0.5" />
                <span className="text-[10px] font-bold text-white/60 leading-none">
                  {manaTotal}
                </span>
              </div>
            </div>

            {/* "MANA ZONE" curved text equivalent (simplified) */}
            <div className="absolute -bottom-1 text-[7px] font-black text-orange-500/80 uppercase tracking-[0.2em] select-none">
               ENERGY CORE
            </div>
          </button>
        </DroppableZone>
      </motion.div>

      {/* CENTER: Hyperspatial + G-Zone */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto flex items-end gap-2"
      >
        <DroppableZone
          id={hyperspatialKey}
          title=""
          label=""
          className="!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl hover:!border-blue-500/40 transition-all duration-300"
          style={{ minWidth: 'auto', minHeight: 'auto' }}
          count={(zones[hyperspatialKey] || []).length}
          onView={() => setViewingZone({ zone: hyperspatialKey, mode: "full" })}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: hyperspatialKey, mode: "full" }); }}
            className="group flex items-center gap-2 px-3 py-2 active:scale-95 transition-all w-full"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base font-black text-white">{(zones[hyperspatialKey] || []).length}</span>
            </div>
          </button>
        </DroppableZone>

        {(zones[gZoneKey] || []).length > 0 && (
          <DroppableZone
            id={gZoneKey}
            title=""
            label=""
            className="!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl hover:!border-cyan-500/40 transition-all duration-300"
            style={{ minWidth: 'auto', minHeight: 'auto' }}
            count={(zones[gZoneKey] || []).length}
            onView={() => setViewingZone({ zone: gZoneKey, mode: "full" })}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: gZoneKey, mode: "full" }); }}
              className="group flex items-center gap-2 px-3 py-2 active:scale-95 transition-all w-full"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/30 transition-colors">
                <span className="text-xs font-black text-cyan-400">G</span>
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-base font-black text-white">{(zones[gZoneKey] || []).length}</span>
              </div>
            </button>
          </DroppableZone>
        )}
      </motion.div>

      {/* RIGHT: Deck + Graveyard + Banish */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0}
        className="pointer-events-auto flex items-end gap-2"
      >
        <DroppableZone
          id={deckKey}
          title=""
          label=""
          className="!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl hover:!border-slate-400/40 transition-all duration-300"
          style={{ minWidth: 'auto', minHeight: 'auto' }}
          count={(zones[deckKey] || []).length}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: deckKey, mode: "full" }); }}
            className="group flex items-center gap-2 px-3 py-2 active:scale-95 transition-all w-full"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0 group-hover:bg-slate-500/20 transition-all duration-300 overflow-hidden">
              <img 
                src="/deck_widget_icon.webp" 
                alt="Deck Icon" 
                className="w-full h-full object-contain scale-x-[-1]"
              />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base font-black text-white">{(zones[deckKey] || []).length}</span>
            </div>
          </button>
        </DroppableZone>

        <DroppableZone
          id={cemeteryKey}
          title=""
          label=""
          className="!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl hover:!border-red-500/40 transition-all duration-300"
          style={{ minWidth: 'auto', minHeight: 'auto' }}
          count={(zones[cemeteryKey] || []).length}
          onView={() => setViewingZone({ zone: cemeteryKey, mode: "full" })}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: cemeteryKey, mode: "full" }); }}
            className="group flex items-center gap-2 px-3 py-2 active:scale-95 transition-all w-full"
          >
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 group-hover:bg-red-500/30 transition-colors">
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-base font-black text-white">{(zones[cemeteryKey] || []).length}</span>
            </div>
          </button>
        </DroppableZone>

        {(zones[banishKey] || []).length > 0 && (
          <DroppableZone
            id={banishKey}
            title=""
            label=""
            className="!rounded-xl !border !border-white/10 !bg-slate-900/80 !backdrop-blur-xl hover:!border-violet-500/40 transition-all duration-300"
            style={{ minWidth: 'auto', minHeight: 'auto' }}
            count={(zones[banishKey] || []).length}
            onView={() => setViewingZone({ zone: banishKey, mode: "full" })}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewingZone({ zone: banishKey, mode: "full" }); }}
              className="group flex items-center gap-2 px-3 py-2 active:scale-95 transition-all w-full"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:bg-violet-500/30 transition-colors">
                <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-base font-black text-white">{(zones[banishKey] || []).length}</span>
              </div>
            </button>
          </DroppableZone>
        )}
      </motion.div>
    </div>
  );
}
