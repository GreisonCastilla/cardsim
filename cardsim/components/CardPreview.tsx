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

  return (
    <div
      className="fixed right-5 top-1/2 -translate-y-1/2 z-[950] pointer-events-none flex flex-col drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
      style={{ width: '26vh' }}
    >
      <div className="w-full aspect-[3/4] overflow-hidden rounded-t-lg bg-black/60 shadow-inner">
        <Card card={{ ...previewCard, face: "up", position: "vertical" }} isOverlay isStatic />
      </div>

      <div className="bg-[#05070a]/98 backdrop-blur-xl p-4 rounded-b-lg border-t border-white/5 shadow-2xl">
        <div className="max-h-[20vh] overflow-y-auto custom-scrollbar-invisible">
          <p className="text-[12px] text-white/80 leading-relaxed font-medium selection:bg-blue-500/30 whitespace-pre-line">
            {previewCard.descriptionJa && previewCard.descriptionEn 
              ? t(previewCard.descriptionJa, previewCard.descriptionEn) 
              : previewCard.description}
          </p>
        </div>
      </div>
    </div>
  );
}
