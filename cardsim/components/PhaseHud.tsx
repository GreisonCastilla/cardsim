"use client";

import React from "react";
import { SkipForward } from 'lucide-react';
import { cn } from "../lib/utils";
import { PlayerId, PhaseName, PHASES } from "../store/gameStore";

interface PhaseHudProps {
  currentPhase: PhaseName;
  currentPlayer: PlayerId;
  nextPhase: () => void;
  combatLinksCount: number;
  clearCombatLinks: () => void;
}

export function PhaseHud({ currentPhase, currentPlayer, nextPhase, combatLinksCount, clearCombatLinks }: PhaseHudProps) {
  return (
    <div className="flex justify-center items-center">
      <div className="flex items-center glass px-2 rounded-full shadow-2xl pointer-events-auto h-5 transition-all transform hover:scale-[1.02] border border-white/[0.06] bg-slate-900/50 backdrop-blur-xl">


        {/* Turn Indicator */}
        <div className={cn(
          "px-1.5 h-full py-0.5 rounded-full flex items-center gap-1 mr-1.5",
          currentPlayer === "p1"
            ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
            : "bg-purple-500/10 border border-purple-500/15 text-purple-400"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            currentPlayer === "p1" ? "bg-blue-400 shadow-[0_0_5px_#60a5fa]" : "bg-purple-400 shadow-[0_0_5px_#a855f7]"
          )} />
          <span className="text-[8px] font-black uppercase tracking-wide leading-none">{currentPlayer === "p1" ? "TU TURNO" : "OPONENTE"}</span>
        </div>

        {/* Phases List */}
        <div className="flex items-center gap-1.5 px-1.5 border-l border-white/[0.06] h-full">
          {PHASES.map((phase) => (
            <div key={phase} className="flex flex-col items-center justify-center relative h-full">
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-wide transition-all duration-300 leading-none",
                currentPhase === phase
                  ? "text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
                  : "text-slate-500 opacity-25 hover:opacity-40"
              )}>
                {phase}
              </span>
              {currentPhase === phase && (
                <div className="absolute bottom-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              )}
            </div>
          ))}
        </div>

        {combatLinksCount > 0 && (
          <button
            onClick={clearCombatLinks}
            className="ml-1.5 px-1.5 h-full py-0.5 border border-red-500/20 bg-red-500/8 rounded-full flex items-center gap-1 text-[8px] font-black text-red-400 hover:text-red-300 hover:bg-red-500/15 uppercase tracking-wide leading-none transition-all cursor-pointer"
          >
            Clear ({combatLinksCount})
          </button>
        )}

        {/* Next Button */}
        <button
          onClick={nextPhase}
          className="ml-1.5 pl-1.5 pr-0.5 h-full border-l border-white/[0.06] flex items-center gap-1 text-[8px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-wide leading-none group transition-all cursor-pointer"
        >
          <span>Sig.</span>
          <div className="bg-blue-500/10 p-0.5 rounded-sm group-hover:bg-blue-500/20 transition-all border border-blue-500/8">
            <SkipForward size={8} fill="currentColor" />
          </div>
        </button>
      </div>
    </div>
  );
}
