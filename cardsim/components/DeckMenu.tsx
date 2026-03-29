"use client";

import React from "react";
import { ArrowDownCircle, Droplet, Shield, Shuffle, Search, Eye, X } from 'lucide-react';
import { cn } from "../lib/utils";
import { ZoneName, PlayerId } from "../store/gameStore";

interface DeckMenuState {
  pid: PlayerId;
  x: number;
  y: number;
}

interface DeckMenuProps {
  deckMenu: DeckMenuState | null;
  zones: Record<ZoneName, string[]>;
  drawAmt: Record<PlayerId, number>;
  manaAmt: Record<PlayerId, number>;
  shieldAmt: Record<PlayerId, number>;
  lookAmt: Record<PlayerId, number>;
  revealAmt: Record<PlayerId, number>;
  graveAmt: Record<PlayerId, number>;
  setDrawAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  setManaAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  setShieldAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  setLookAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  setRevealAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  setGraveAmt: React.Dispatch<React.SetStateAction<Record<PlayerId, number>>>;
  execDraw: (pid: PlayerId) => void;
  execMana: (pid: PlayerId) => void;
  execShield: (pid: PlayerId) => void;
  execLook: (pid: PlayerId) => void;
  execReveal: (pid: PlayerId) => void;
  execGrave: (pid: PlayerId) => void;
  shuffleDeck: (pid: PlayerId) => void;
  setViewingZone: (state: any) => void;
  setDeckMenu: (state: DeckMenuState | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export function DeckMenu({
  deckMenu,
  zones,
  drawAmt,
  manaAmt,
  shieldAmt,
  lookAmt,
  revealAmt,
  graveAmt,
  setDrawAmt,
  setManaAmt,
  setShieldAmt,
  setLookAmt,
  setRevealAmt,
  setGraveAmt,
  execDraw,
  execMana,
  execShield,
  execLook,
  execReveal,
  execGrave,
  shuffleDeck,
  setViewingZone,
  setDeckMenu,
  menuRef,
}: DeckMenuProps) {
  if (!deckMenu) return null;

  const numInputCls = "w-9 bg-black/40 text-center text-white text-[9px] font-black outline-none border-x border-white/5 focus:bg-blue-900/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div
      ref={menuRef}
      className="fixed z-[1100] bg-[#090c12]/98 backdrop-blur-xl border border-white/10 shadow-4xl w-48 flex flex-col p-0 animate-in fade-in slide-in-from-bottom-4 duration-400 max-h-[80vh] overflow-hidden"
      style={{
        left: deckMenu.x > window.innerWidth - 200 ? deckMenu.x - 200 : Math.max(10, deckMenu.x - 90),
        top: Math.max(10, Math.min(deckMenu.y - 150, window.innerHeight - 400))
      }}
    >
      <div className="px-3 py-2 flex justify-between items-center border-b border-white/10 bg-white/10">
        <span className="text-[9px] text-white font-black uppercase tracking-[0.3em] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Library
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
  );
}
