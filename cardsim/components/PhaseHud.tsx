"use client";

import React from "react";
import { SkipForward } from 'lucide-react';
import { cn } from "../lib/utils";
import { PlayerId, PhaseName, PHASES } from "../store/gameStore";

interface PhaseHudProps {
  currentPhase: PhaseName;
  currentPlayer: PlayerId;
  nextPhase: () => void;
}

export function PhaseHud({ currentPhase, currentPlayer, nextPhase }: PhaseHudProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none w-full flex justify-center">
      <div className="flex items-center bg-[#0f172a]/80 backdrop-blur-[12px] border border-white/10 p-0.5 px-3 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5),0_0_10px_rgba(255,255,255,0.05)] pointer-events-auto h-8 transition-all scale-95 origin-center">
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
          className="ml-3 pl-4 pr-2 h-5 border-l border-white/10 flex items-center gap-2 text-[8px] font-black text-blue-400/70 hover:text-blue-400 uppercase tracking-[0.2em] group transition-all"
        >
          <span className="drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">Next Step</span>
          <div className="bg-blue-500/10 p-0.5 rounded-md group-hover:bg-blue-500/20 transition-all">
            <SkipForward size={10} className="text-blue-400" />
          </div>
        </button>
      </div>
    </div>
  );
}
