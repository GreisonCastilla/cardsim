"use client";

import React, { useState, useEffect } from "react";
import { GameCard } from "../store/gameStore";
import { useLanguage } from "./LanguageContext";
import { Layers, Zap, ExternalLink, Edit2, Check, X as CloseIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface CardDisplaySideProps {
  selectedCard: GameCard | null;
  // Optional editing features for deck builder
  isEditingDesc?: boolean;
  editingDesc?: string;
  setEditingDesc?: (val: string) => void;
  onStartEdit?: () => void;
  onSaveDesc?: () => void;
  onCancelEdit?: () => void;
  onFullEdit?: () => void;
}

export function CardDisplaySide({ 
  selectedCard,
  isEditingDesc,
  editingDesc,
  setEditingDesc,
  onStartEdit,
  onSaveDesc,
  onCancelEdit,
  onFullEdit
}: CardDisplaySideProps) {
  const { language, t } = useLanguage();
  
  // Sync with card's active face if it's in a game, default to 0 for preview
  const [viewFaceIndex, setViewFaceIndex] = useState<number>(0);

  useEffect(() => {
    if (selectedCard) {
      setViewFaceIndex(selectedCard.activeFaceIndex ?? 0);
    }
  }, [selectedCard?.id, selectedCard?.activeFaceIndex]);

  if (!selectedCard) {
    return (
      <aside className="w-[280px] xl:w-[300px] 2xl:w-[320px] shrink-0 h-full flex flex-col overflow-hidden border-r border-white/5 bg-[#0a0f1e]/95 backdrop-blur-2xl">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-700">
          <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center border border-white/5 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 animate-pulse">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          <div className="space-y-1 px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t("カードが選択されていません", "No card selected")}
            </p>
            <p className="text-[9px] text-slate-500 font-medium">
              {t("詳細を表示するにはカードをクリックしてください。", "Click a card to view its details here.")}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const isBack = viewFaceIndex > 0;
  const activeFace = isBack && selectedCard.backs && selectedCard.backs.length >= viewFaceIndex
    ? selectedCard.backs[viewFaceIndex - 1]
    : null;

  const resolveImage = (cardOrFace: any, isBackFace: boolean) => {
    if (cardOrFace.preferredImageUrl) return cardOrFace.preferredImageUrl;
    const rawUrl = isBackFace ? cardOrFace.image_url : cardOrFace.image;
    if (!rawUrl) return null;
    const urls = rawUrl.includes('\n') ? rawUrl.split('\n') : rawUrl.includes(',') ? rawUrl.split(',') : [rawUrl];
    return urls[0]?.trim() || null;
  };

  const img = isBack && activeFace ? resolveImage(activeFace, true) : resolveImage(selectedCard, false);
  
  const getProp = (obj: any, keys: string[]) => {
    if (!obj) return null;
    for (const key of keys) {
      const val = obj[key];
      if (val !== undefined && val !== null && val !== "" && typeof val === 'string' && val.trim() !== '') {
        return val.trim();
      }
    }
    return null;
  };

  const nameJa = isBack && activeFace ? "" : getProp(selectedCard, ['nameJa', 'name_ja']);
  const nameEn = isBack && activeFace ? activeFace.name : getProp(selectedCard, ['nameEn', 'name_en', 'name']);
  const displayName = (language === 'ja' ? (nameJa || nameEn) : (nameEn || nameJa || selectedCard.name)) || "Unknown Card";

  const descJa = isBack && activeFace ? activeFace.abilities_ja : getProp(selectedCard, ['descriptionJa', 'abilities_ja']);
  const descEn = isBack && activeFace ? activeFace.abilities_en : getProp(selectedCard, ['descriptionEn', 'abilities_en', 'description']);
  const fallBackDesc = isBack && activeFace ? activeFace.abilities_ja || activeFace.abilities_en : selectedCard.description;

  const race = isBack && activeFace
    ? (language === 'ja' ? activeFace.race_ja || activeFace.race_en : activeFace.race_en || activeFace.race_ja)
    : (language === 'ja' 
        ? getProp(selectedCard, ['raceJa', 'race_ja', 'raceEn', 'race_en', 'race', 'species', 'subtype'])
        : getProp(selectedCard, ['raceEn', 'race_en', 'raceJa', 'race_ja', 'race', 'species', 'subtype'])
      );

  const cardType = isBack && activeFace
    ? (language === 'ja' ? activeFace.type_ja || activeFace.type_en : activeFace.type_en || activeFace.type_ja)
    : (language === 'ja' 
        ? getProp(selectedCard, ['typeJa', 'type_ja', 'typeEn', 'type_en', 'type', 'card_type']) 
        : getProp(selectedCard, ['typeEn', 'type_en', 'typeJa', 'type_ja', 'type', 'card_type'])
      );

  const totalFaces = 1 + (selectedCard.backs ? selectedCard.backs.length : 0);

  return (
    <aside className="w-[280px] xl:w-[300px] 2xl:w-[320px] shrink-0 h-full flex flex-col overflow-hidden border-r border-white/5 bg-[#0a0f1e]/98 backdrop-blur-3xl shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-[3000]">
      <div className="p-3 flex-1 flex flex-col gap-3 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
        
        <div className="flex flex-col gap-3 overflow-hidden flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card Image Frame */}
          <div className="w-full max-w-[170px] aspect-[5/7] shrink-0 transition-all hover:scale-[1.05] duration-500 group relative mx-auto flex items-center justify-center p-1 bg-slate-800/20 rounded-xl shadow-xl border border-white/5">
            <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            {img ? (
              <img
                src={img}
                alt={displayName}
                className="max-w-full max-h-full object-contain rounded-md shadow-2xl relative z-10"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-950/80 rounded-md flex flex-col items-center justify-center border border-white/5 relative z-10">
                <Layers className="w-6 h-6 text-slate-700 mb-1" />
                <span className="text-slate-600 text-[8px] uppercase font-black tracking-widest">No Image</span>
              </div>
            )}
          </div>

          {/* Info Frame - Guaranteed space for race and name */}
          <div className="flex-1 overflow-hidden flex flex-col gap-3 bg-slate-900/50 border border-white/5 rounded-[1.5rem] p-4 shadow-2xl backdrop-blur-md relative">
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none rounded-t-[1.5rem]" />
            
            {/* Header Section */}
            <div className="flex flex-col gap-1.5 relative shrink-0 min-h-0">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col flex-1 gap-1 overflow-hidden">
                  <h3 className="text-[14px] font-black text-white leading-tight uppercase tracking-tight break-words">{displayName}</h3>
                  
                  {/* Race - High priority display */}
                  <div className="flex items-start gap-1.5 min-h-[14px]">
                    <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500 shrink-0 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wide leading-tight break-words">
                      {race || "Raza no especificada"}
                    </span>
                  </div>
                </div>

                {selectedCard.source_url && (
                  <a
                    href={selectedCard.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all border border-white/10 shrink-0 shadow-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {cardType && (
                  <div className="px-1 pt-0 pb-[0.5px] bg-indigo-500/20 border border-indigo-500/30 rounded-sm flex items-center">
                    <span className="text-[9px] font-black text-indigo-200 uppercase tracking-normal leading-[1]">
                      {cardType}
                    </span>
                  </div>
                )}
                {totalFaces > 1 && (
                  <button
                    onClick={() => setViewFaceIndex((viewFaceIndex + 1) % totalFaces)}
                    className="p-1 px-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-md transition-all border border-blue-500/20 flex items-center gap-1 text-[8px] font-black"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    <span>{viewFaceIndex + 1}/{totalFaces}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ability Section */}
            <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between px-0.5 shrink-0">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">{t("アビリティ", "Abilities")}</span>
                
                <div className="flex items-center gap-1.5">
                  {onStartEdit && !isEditingDesc && (
                    <>
                      {onFullEdit && (
                        <button onClick={onFullEdit} className="p-1 hover:bg-slate-800 rounded-md text-amber-500/60 hover:text-amber-400 transition-all">
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={onStartEdit} className="p-1 hover:bg-slate-800 rounded-md text-blue-500/60 hover:text-blue-400 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {isEditingDesc && onSaveDesc && onCancelEdit && (
                    <div className="flex gap-1">
                      <button onClick={onSaveDesc} className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={onCancelEdit} className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-400 border border-red-500/20">
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 relative min-h-0">
                {isEditingDesc && setEditingDesc ? (
                  <textarea
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    className="w-full h-full text-[11px] text-white leading-relaxed bg-[#05070a] p-3 rounded-xl border-2 border-blue-500/30 focus:outline-none focus:border-blue-500 transition-all custom-scrollbar-thin font-medium resize-none shadow-2xl"
                    autoFocus
                  />
                ) : (
                  <div className="w-full h-full text-[11px] text-slate-300 leading-relaxed bg-[#05070a]/90 p-3 rounded-xl border border-white/5 whitespace-pre-wrap overflow-y-auto custom-scrollbar-thin font-medium shadow-[inset_0_0_15px_rgba(0,0,0,0.6)] relative group">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative z-10 opacity-90">
                      {t(descJa || fallBackDesc, descEn || fallBackDesc)}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between shrink-0">
                 <div className="flex gap-3">
                    {(selectedCard.rarity || (selectedCard as any).rarity_en) && (
                      <div className="flex flex-col">
                        <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">Rarity</span>
                        <span className="text-[8px] font-black text-amber-500/70 tracking-tight">{selectedCard.rarity || (selectedCard as any).rarity_en}</span>
                      </div>
                    )}
                    {selectedCard.primary_set && (
                      <div className="flex flex-col">
                        <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">Set</span>
                        <span className="text-[8px] font-black text-slate-500 tracking-tight">{selectedCard.primary_set}</span>
                      </div>
                    )}
                 </div>
                 
                 <div className="flex gap-3 text-right opacity-0 pointer-events-none">
                    {/* Cost and Power removed as requested */}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
