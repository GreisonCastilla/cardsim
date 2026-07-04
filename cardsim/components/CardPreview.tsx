"use client";

import React from "react";
import { Card } from "./Card";
import { GameCard } from "../store/gameStore";
import { useLanguage } from "./LanguageContext";

interface CardPreviewProps {
  previewCard: GameCard | null;
}

export function CardPreview({ previewCard }: CardPreviewProps) {
  const { language, t } = useLanguage();

  if (!previewCard) return null;

  const currentFace = previewCard.activeFaceIndex && previewCard.backs && previewCard.activeFaceIndex > 0
    ? previewCard.backs[previewCard.activeFaceIndex - 1]
    : null;

  const description = currentFace
    ? (currentFace.abilities_ja && currentFace.abilities_en
      ? t(currentFace.abilities_ja, currentFace.abilities_en)
      : (currentFace.abilities_en || ""))
    : (previewCard.descriptionJa && previewCard.descriptionEn
      ? t(previewCard.descriptionJa, previewCard.descriptionEn)
      : previewCard.description);

  const race = currentFace
    ? (language === 'ja' ? currentFace.race_ja || currentFace.race_en : currentFace.race_en || currentFace.race_ja)
    : (language === 'ja'
      ? (previewCard.raceJa || (previewCard as any).race_ja || (previewCard as any).race || (previewCard as any).species || previewCard.raceEn || (previewCard as any).race_en)
      : (previewCard.raceEn || (previewCard as any).race_en || (previewCard as any).race || (previewCard as any).species || previewCard.raceJa || (previewCard as any).race_ja)
    );

  const cardType = currentFace
    ? (language === 'ja' ? currentFace.type_ja || currentFace.type_en : currentFace.type_en || currentFace.type_ja)
    : (language === 'ja'
      ? (previewCard.typeJa || (previewCard as any).type_ja || (previewCard as any).type || (previewCard as any).card_type || previewCard.typeEn || (previewCard as any).type_en)
      : (previewCard.typeEn || (previewCard as any).type_en || (previewCard as any).type || (previewCard as any).card_type || previewCard.typeEn || (previewCard as any).type_en)
    );

  const name = currentFace
    ? currentFace.name
    : (language === 'ja' ? (previewCard.nameJa || previewCard.name) : (previewCard.nameEn || previewCard.name));

  return (
    <div
      className="fixed right-5 top-1/2 -translate-y-1/2 z-[3500] pointer-events-none flex flex-col drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
      style={{ width: '32vh' }}
    >
      <div className="w-full aspect-[3/4] overflow-hidden rounded-t-xl bg-black/60 shadow-inner ring-1 ring-white/10">
        <Card card={{ ...previewCard, face: "up", position: "vertical" }} isOverlay isStatic />
      </div>

      <div className="bg-[#05070a]/98 backdrop-blur-3xl p-5 rounded-b-xl border-x border-b border-white/10 shadow-2xl">
        <div className="flex flex-col gap-2 mb-4 border-b border-white/5 pb-3">
          <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{name}</h3>

          <div className="flex flex-col gap-1.5">
            {cardType && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{cardType}</span>
              </div>
            )}
            {race && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{race}</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-h-[20vh] overflow-y-auto custom-scrollbar-invisible">
          <p className="text-[12px] text-slate-300 leading-relaxed font-medium selection:bg-blue-500/30 whitespace-pre-line italic">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
