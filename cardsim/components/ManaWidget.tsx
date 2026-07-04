"use client";

import React, { useMemo, useState } from 'react';
import { GameCard } from '../store/gameStore';
import { cn } from '../lib/utils';
import { Card } from './Card';

interface ManaWidgetProps {
  cards: GameCard[];
  onCardClick?: (card: GameCard) => void;
  className?: string;
}

type CivType = 'Fire' | 'Water' | 'Nature' | 'Light' | 'Darkness' | 'Unknown';

const CIV_CONFIG: Record<CivType, { color: string; bg: string; border: string; icon: string }> = {
  Fire: { color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: '🔥' },
  Water: { color: '#3b82f6', bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: '💧' },
  Nature: { color: '#10b981', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: '🌿' },
  Light: { color: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: '☀️' },
  Darkness: { color: '#a855f7', bg: 'bg-purple-500/20', border: 'border-purple-500/50', icon: '💀' },
  Unknown: { color: '#64748b', bg: 'bg-slate-500/20', border: 'border-slate-500/50', icon: '❓' },
};

const CIV_MAP: Record<string, CivType> = {
  'Fire': 'Fire', '火': 'Fire',
  'Water': 'Water', '水': 'Water',
  'Nature': 'Nature', '自然': 'Nature',
  'Light': 'Light', '光': 'Light',
  'Darkness': 'Darkness', '闇': 'Darkness', 'Dark': 'Darkness'
};

export function ManaWidget({ cards, onCardClick, className }: ManaWidgetProps) {
  const [selectedCiv, setSelectedCiv] = useState<CivType | null>(null);

  const stats = useMemo(() => {
    const counts: Record<CivType, { total: number; untapped: number; tapped: number; cards: GameCard[] }> = {
      Fire: { total: 0, untapped: 0, tapped: 0, cards: [] },
      Water: { total: 0, untapped: 0, tapped: 0, cards: [] },
      Nature: { total: 0, untapped: 0, tapped: 0, cards: [] },
      Light: { total: 0, untapped: 0, tapped: 0, cards: [] },
      Darkness: { total: 0, untapped: 0, tapped: 0, cards: [] },
      Unknown: { total: 0, untapped: 0, tapped: 0, cards: [] },
    };

    cards.forEach(card => {
      const civStr = card.civilization || card.color || '';
      const civs = civStr.split('/').map(c => c.trim());

      let found = false;
      civs.forEach(rawCiv => {
        const mapped = CIV_MAP[rawCiv] as CivType;
        if (mapped && counts[mapped]) {
          counts[mapped].total++;
          if (card.position === 'horizontal') counts[mapped].tapped++;
          else counts[mapped].untapped++;
          counts[mapped].cards.push(card);
          found = true;
        }
      });

      if (!found && civStr) {
        counts['Unknown' as CivType].total++;
        counts['Unknown' as CivType].cards.push(card);
      }
    });

    return counts;
  }, [cards]);

  return (
    <div className={cn("relative flex items-center gap-3 p-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl", className)}>
      {/* Civilization Icons */}
      {(Object.entries(CIV_CONFIG) as [CivType, typeof CIV_CONFIG['Fire']][]).map(([civ, config]) => {
        const data = stats[civ];
        if (data.total === 0) return null;

        return (
          <button
            key={civ}
            onClick={() => setSelectedCiv(selectedCiv === civ ? null : civ)}
            className={cn(
              "group relative flex flex-col items-center gap-1 transition-all duration-300 hover:scale-110",
              selectedCiv === civ ? "scale-110" : "opacity-80 hover:opacity-100"
            )}
          >
            {/* Circular Icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-all duration-500",
              config.bg,
              config.border,
              selectedCiv === civ && "shadow-[0_0_20px_var(--civ-color)]"
            )}
              style={{ '--civ-color': config.color } as any}
            >
              <span className="text-lg filter drop-shadow-md">{config.icon}</span>
            </div>

            {/* Numeric Badge */}
            <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded-full border border-white/5">
              <span className="text-[10px] font-black text-white">{data.untapped}</span>
              <div className="w-[1px] h-2 bg-white/20" />
              <span className="text-[10px] font-bold text-white/40">{data.total}</span>
            </div>

            {/* Tapped Indicator */}
            {data.tapped > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white/20 flex items-center justify-center animate-pulse">
                <span className="text-[8px] font-black text-white">{data.tapped}</span>
              </div>
            )}
          </button>
        );
      })}

      {/* Overlay Panel */}
      {selectedCiv && (
        <div className="absolute bottom-full left-0 mb-4 w-max max-w-[400px] bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-300 z-50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", CIV_CONFIG[selectedCiv].bg)} />
              <span className="text-xs font-black text-white uppercase tracking-widest">{selectedCiv} MANA</span>
            </div>
            <button onClick={() => setSelectedCiv(null)} className="text-white/40 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {stats[selectedCiv].cards.map((card, idx) => (
              <div
                key={`${card.id}-${idx}`}
                className={cn(
                  "w-12 transition-all duration-300 hover:scale-110 cursor-pointer",
                  card.position === 'horizontal' && "opacity-50 grayscale-[0.5]"
                )}
                onClick={() => onCardClick?.(card)}
              >
                <Card card={card} zone="p1_manaZone" isStatic />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
