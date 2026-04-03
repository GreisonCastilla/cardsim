"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchCards, fetchDecks, saveDeck, deleteDeck } from "../../lib/api";
import { GameCard, CardPosition, CardFace, PlayerId } from "../../store/gameStore";
import { Card } from "../../components/Card";
import { cn } from "../../lib/utils";
import { Search, ChevronLeft, ChevronRight, Save, Trash2, LayoutGrid, Layers, Zap, Info, Filter, Plus, Minus, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../components/LanguageContext";

interface DeckData {
  id: string;
  name: string;
  mainDeck: GameCard[];
  gZone: GameCard[];
  hyperspatial: GameCard[];
}

export default function DeckBuilder() {
  const { language, t } = useLanguage();
  const [availableCards, setAvailableCards] = useState<GameCard[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Multiple decks state
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string>("");

  // UI state
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [targetZone, setTargetZone] = useState<"main" | "g" | "hyper">("main");
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    const initDecks = async () => {
      const token = localStorage.getItem("cardsim_token");
      
      // Try backend first if authenticated
      if (token) {
        try {
          const backendDecks = await fetchDecks();
          if (backendDecks && backendDecks.length > 0) {
            const mapped: DeckData[] = backendDecks.map(d => ({
              id: d.id.toString(),
              name: d.name,
              mainDeck: d.main_deck || [],
              gZone: d.g_zone || [],
              hyperspatial: d.hyperspatial || []
            }));
            setDecks(mapped);
            setCurrentDeckId(mapped[0].id);
            // Persist to local storage to avoid future local default creations
            localStorage.setItem("cardsim_decks", JSON.stringify(mapped));
            return;
          } else {
             // Authenticated but no decks in backend, create a default one in backend
             await saveDeck({ name: "Mi Primer Mazo", main_deck: [], g_zone: [], hyperspatial: [] });
             const newBackendDecks = await fetchDecks();
             if (newBackendDecks && newBackendDecks.length > 0) {
               const mapped: DeckData[] = newBackendDecks.map(d => ({
                 id: d.id.toString(),
                 name: d.name,
                 mainDeck: d.main_deck || [],
                 gZone: d.g_zone || [],
                 hyperspatial: d.hyperspatial || []
               }));
               setDecks(mapped);
               setCurrentDeckId(mapped[0].id);
               localStorage.setItem("cardsim_decks", JSON.stringify(mapped));
               return;
             }
          }
        } catch(err) {
          console.error("Backend fetch failed, falling back to local storage:", err);
          // Proceed to local check
        }
      }

      // Fallback to local
      const saved = localStorage.getItem("cardsim_decks");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDecks(parsed);
          setCurrentDeckId(parsed[0].id);
          return;
        }
      }

      // ONLY create "Mi Primer Mazo" locally if NOT logged in and nothing exists.
      // If there is a token, we expect the backend to have the decks (even if it currently failed),
      // so we avoid creating a redundant local-only dummy deck.
      if (!token) {
        const defaultDeck = { id: "deck_1", name: "Mi Primer Mazo", mainDeck: [], gZone: [], hyperspatial: [] };
        setDecks([defaultDeck]);
        setCurrentDeckId(defaultDeck.id);
      }
    };
    initDecks();
  }, []);

  const currentDeck = useMemo(() => decks.find(d => d.id === currentDeckId) || { id: "err", name: "Error", mainDeck: [], gZone: [], hyperspatial: [] }, [decks, currentDeckId]);

  const updateCurrentDeck = (updateFn: (d: DeckData) => DeckData) => {
    setDecks(prev => {
      const newDecks = prev.map(d => d.id === currentDeckId ? updateFn(d) : d);
      localStorage.setItem("cardsim_decks", JSON.stringify(newDecks));
      return newDecks;
    });
  };

  const loadCards = useCallback(async () => {
    try {
      const data = await fetchCards(q, page, limit, language);
      const mapped = data.cards.map((c: any, i: number) => ({
        id: `db_${c.name_ja || i}_${c.name_en}`,
        name: c.name_en || c.name_ja || "Unknown Card",
        nameJa: c.name_ja,
        nameEn: c.name_en,
        image: c.image_url,
        description: c.abilities_en || c.abilities_ja || "",
        descriptionJa: c.abilities_ja,
        descriptionEn: c.abilities_en,
        manaCost: c.cost || c.mana || "-",
        attack: c.power || "-",
        color: "#3b82f6", 
        position: "vertical" as CardPosition,
        face: "up" as CardFace,
        owner: "p1" as PlayerId,
        linkedCardIds: []
      }));
      setAvailableCards(mapped);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    }
  }, [q, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1);
        loadCards();
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    loadCards();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  // Grouping function
  const groupCards = (cards: GameCard[]) => {
    const grouped = new Map<string, { card: GameCard, count: number }>();
    cards.forEach(c => {
      // Using name/image combination as a unique identifier for grouping
      const key = `${c.nameJa || c.name}_${c.image}`;
      if (grouped.has(key)) {
        grouped.get(key)!.count++;
      } else {
        grouped.set(key, { card: { ...c, id: `grouped_${key}` }, count: 1 });
      }
    });
    return Array.from(grouped.values());
  };

  const addCard = (cardData: GameCard, zone: "main" | "g" | "hyper") => {
    const newCard = { ...cardData, id: `deck_${Date.now()}_${Math.random()}` };
    updateCurrentDeck(d => {
      if (zone === "main") return { ...d, mainDeck: [...d.mainDeck, newCard] };
      if (zone === "g") return { ...d, gZone: [...d.gZone, newCard] };
      return { ...d, hyperspatial: [...d.hyperspatial, newCard] };
    });
  };

  const removeGroupedCard = (cardData: GameCard, zone: "main" | "g" | "hyper") => {
    updateCurrentDeck(d => {
      let targetZone = zone === "main" ? d.mainDeck : zone === "g" ? d.gZone : d.hyperspatial;
      // Remove exactly one instance that matches the key.
      // We remove the LAST occurrence to preserve the position of the first occurrence, 
      // keeping the group rendering order perfectly stable.
      const keyStr = `${cardData.nameJa || cardData.name}_${cardData.image}`;
      let lastIndex = -1;
      for (let i = targetZone.length - 1; i >= 0; i--) {
        if (`${targetZone[i].nameJa || targetZone[i].name}_${targetZone[i].image}` === keyStr) {
           lastIndex = i;
           break;
        }
      }
      
      if (lastIndex !== -1) {
        const newZ = [...targetZone];
        newZ.splice(lastIndex, 1);
        if (zone === "main") return { ...d, mainDeck: newZ };
        if (zone === "g") return { ...d, gZone: newZ };
        return { ...d, hyperspatial: newZ };
      }
      return d;
    });
  };

  const createNewDeck = async () => {
    const name = `Nuevo Mazo ${decks.length + 1}`;
    
    const newDeck = { id: `deck_${Date.now()}`, name, mainDeck: [], gZone: [], hyperspatial: [] };
    setDecks(prev => {
      const next = [...prev, newDeck];
      localStorage.setItem("cardsim_decks", JSON.stringify(next));
      return next;
    });
    setCurrentDeckId(newDeck.id);
  };

  const deleteCurrentDeck = async () => {
    if (decks.length <= 1) return alert("No puedes eliminar tu único mazo.");
    if (!confirm("¿Eliminar este mazo?")) return;
    
    const token = localStorage.getItem("cardsim_token");
    if (token && !isNaN(Number(currentDeckId))) {
       setIsSaving(true);
       try {
           await deleteDeck(currentDeckId);
       } catch (err) {
           console.error("Failed to delete from backend:", err);
       }
       setIsSaving(false);
    }

    setDecks(prev => {
      const next = prev.filter(d => d.id !== currentDeckId);
      localStorage.setItem("cardsim_decks", JSON.stringify(next));
      setCurrentDeckId(next[0].id);
      return next;
    });
  };

  const manualSave = async () => {
    if (!currentDeck || isSaving) return;
    const token = localStorage.getItem("cardsim_token");
    if (!token) {
        alert("Debes iniciar sesión para guardar en la nube.");
        return;
    }
    
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await saveDeck({
        name: currentDeck.name,
        main_deck: currentDeck.mainDeck,
        g_zone: currentDeck.gZone,
        hyperspatial: currentDeck.hyperspatial
      });
      
      // Resync to get real backend ID if it was just a local deck
      if (isNaN(Number(currentDeck.id))) {
          const backendDecks = await fetchDecks();
          if (backendDecks && backendDecks.length > 0) {
            const mapped: DeckData[] = backendDecks.map(d => ({
              id: d.id.toString(),
              name: d.name,
              mainDeck: d.main_deck || [],
              gZone: d.g_zone || [],
              hyperspatial: d.hyperspatial || []
            }));
            setDecks(mapped);
            const synced = mapped.find(d => d.name === currentDeck.name) || mapped[mapped.length - 1];
            setCurrentDeckId(synced.id);
          }
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const groupedMain = groupCards(currentDeck.mainDeck);
  const groupedGZone = groupCards(currentDeck.gZone);
  const groupedHyper = groupCards(currentDeck.hyperspatial);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col h-screen text-sm">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 bg-slate-800/40 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-xl shrink-0">
        <div className="flex items-center gap-4 text-nowrap">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                <Layers className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent tracking-tight">
                  {t("デッキ", "Decks")}
                </h1>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 ring-1 ring-white/5 p-1 rounded-xl bg-slate-900/50">
                <div className="flex items-center gap-2 px-2">
                    <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider shrink-0">{t("デッキを選択", "Selection")}:</span>
                    <select 
                       className="bg-transparent border-none py-0.5 px-0 focus:outline-none min-w-[140px] text-white font-bold text-xs cursor-pointer overflow-hidden text-ellipsis"
                       value={currentDeckId}
                       onChange={e => setCurrentDeckId(e.target.value)}
                    >
                       {decks.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 px-2 border-t border-white/5 pt-1">
                    <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider shrink-0">{t("名前", "Rename")}:</span>
                    <input 
                        type="text"
                        className="bg-transparent border-none py-0.5 px-0 focus:outline-none min-w-[140px] text-blue-400 font-bold text-xs"
                        value={currentDeck.name}
                        onChange={e => updateCurrentDeck(d => ({ ...d, name: e.target.value }))}
                        placeholder={t("デッキ名...", "Deck Name...")}
                    />
                </div>
            </div>

            <div className="flex gap-1 items-center">
                <button 
                  onClick={manualSave} 
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all border font-bold text-xs shadow-lg active:scale-95",
                    saveStatus === 'success' ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" :
                    saveStatus === 'error' ? "bg-red-600/20 text-red-400 border-red-500/30" :
                    "bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border-blue-500/30 hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  )}
                  title={t("保存", "Save to Cloud")}
                >
                  {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="hidden lg:inline">
                      {saveStatus === 'saving' ? t("保存中...", "Saving...") : 
                       saveStatus === 'success' ? t("保存完了", "Saved!") : 
                       saveStatus === 'error' ? t("エラー", "Error!") : 
                       t("保存", "Save")}
                  </span>
                </button>
                <div className="w-[1px] h-6 bg-white/10 mx-1" />
                <button onClick={createNewDeck} className="p-2 bg-slate-700/30 text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-white/10" title={t("新規デッキ", "New Deck")}>
                    <Plus className="w-4 h-4" />
                </button>
                <button onClick={deleteCurrentDeck} className="p-2 bg-slate-700/30 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition-all border border-white/10" title={t("デッキを削除", "Delete Deck")}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <button 
                className="ml-2 px-4 py-2 bg-slate-700/40 hover:bg-slate-700 border border-white/10 rounded-lg font-bold transition-all text-[10px] uppercase tracking-wider hover:border-white/20" 
                onClick={() => window.location.href = "/"}
            >
                {t("戻る", "Exit")}
            </button>
        </div>
      </header>
      
      <main className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* Collection & Details (Left Panel) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          
          {/* Collection */}
          <div className="flex flex-col flex-1 bg-slate-900/30 rounded-2xl border border-white/5 p-4 overflow-hidden backdrop-blur-sm shadow-inner shrink-0">
            <div className="relative group mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder={t("カードを検索...", "Search cards...")} 
                className="w-full bg-slate-800/60 border border-white/5 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all placeholder:text-slate-600 backdrop-blur-sm text-xs"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mb-1 px-1">
              <p className="text-[9px] text-slate-400 font-bold uppercase">{total} {t("結果", "Results")}</p>
              <div className="flex items-center gap-1">
                  <button disabled={page === 1} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3 h-3" /></button>
                  <span className="text-[10px] font-black text-blue-400 w-10 text-center">{page} / {totalPages || 1}</span>
                  <button disabled={page === totalPages || totalPages === 0} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3 h-3" /></button>
              </div>
            </div>

            <div className="flex gap-1 mb-3 bg-slate-800/50 p-1 rounded-lg border border-white/5">
                <button 
                    onClick={() => setTargetZone("main")}
                    className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase transition-all ${targetZone === 'main' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}
                >
                    Main
                </button>
                <button 
                    onClick={() => setTargetZone("g")}
                    className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase transition-all ${targetZone === 'g' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}
                >
                    G-Zone
                </button>
                <button 
                    onClick={() => setTargetZone("hyper")}
                    className={`flex-1 py-1 px-2 rounded-md text-[9px] font-bold uppercase transition-all ${targetZone === 'hyper' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}
                >
                    Hyper
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-3">
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                <AnimatePresence mode="popLayout">
                  {availableCards.map(c => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={c.id} 
                      className="group relative h-full flex flex-col"
                    >
                      <div 
                          onClick={() => { setSelectedCard(c); addCard(c, targetZone); }}
                          onMouseEnter={() => setSelectedCard(c)}
                          className="relative group cursor-pointer transition-all hover:scale-125 hover:z-[100] z-10 aspect-[3/4]"
                      >
                          <Card card={c} isStatic />
                          <div className={`absolute inset-0 border rounded-sm pointer-events-none transition-colors ${selectedCard?.id === c.id ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-transparent group-hover:border-blue-500/50'}`} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Details Panel - Always Visible */}
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 shadow-xl shrink-0 h-[48%] flex flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {selectedCard ? (
              <div className="flex gap-8 overflow-hidden flex-1 items-center">
                <div className="w-52 shrink-0 transition-all hover:scale-[1.02] duration-500 group">
                    {selectedCard.image ? (
                        <img 
                            src={selectedCard.image} 
                            alt={selectedCard.name} 
                            className="w-full h-auto object-contain rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all" 
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full aspect-[3/4] bg-slate-900/50 rounded-lg flex items-center justify-center border border-white/5">
                            <span className="text-slate-600 text-[10px] uppercase font-black">No Image</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                    <div>
                        <h3 className="text-xs font-black text-white leading-tight mb-1">{selectedCard.nameJa && selectedCard.nameEn ? (language === 'ja' ? selectedCard.nameJa : selectedCard.nameEn) : selectedCard.name}</h3>
                    </div>
                    <div className="flex gap-2 text-[10px] font-bold text-slate-300">
                        <div className="bg-slate-900/50 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1 text-yellow-400 uppercase">
                            {t("コスト", "Cost")}: <span className="text-white">{selectedCard.manaCost}</span>
                        </div>
                        <div className="bg-slate-900/50 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1 text-red-300 uppercase">
                            {t("パワー", "Power")}: <span className="text-white">{selectedCard.attack}</span>
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/30 p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar italic font-medium">
                        {t(selectedCard.descriptionJa || selectedCard.description, selectedCard.descriptionEn || selectedCard.description)}
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-700">
                  <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center border border-white/5 shadow-inner">
                      <FileText className="w-10 h-10 text-slate-600 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("カードが選択されていません", "No card selected")}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{t("詳細を表示するにはカードをクリックしてください。", "Click a card to view its details here.")}</p>
                  </div>
              </div>
            )}
          </div>
        </section>
        
        {/* Deck Construction Zones (Right Panel) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar h-full">
          
          {/* Main Deck zone */}
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 transition-all flex flex-col group relative flex-[2] min-h-[400px]">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h3 className="font-black text-white tracking-tight uppercase text-xs">{t("メインデッキ", "Main Deck")}</h3>
                </div>
                <div className="bg-slate-800/80 px-3 py-1 rounded-full border border-white/5 shadow-inner">
                    <span className="text-[10px] font-black text-blue-400">{currentDeck.mainDeck.length}</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 2xl:grid-cols-12 gap-4 content-start pb-8">
                   {groupedMain.map(({card, count}) => (
                        <motion.div 
                            layout
                            key={card.id} 
                            className="relative aspect-[3/4] flex flex-col items-center"
                        >
                            <div 
                                className="w-full h-full relative group shadow-md rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all" 
                                onClick={() => { setSelectedCard(card); addCard(card, "main"); }}
                                onMouseEnter={() => { setSelectedCard(card); setActiveCardKey("main_" + card.id); }}
                                onMouseLeave={() => setActiveCardKey(null)}
                                onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "main"); }}
                            >
                                <Card card={card} isStatic />
                                
                                {/* Quantity controls appear only if actively hovered */}
                                <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-xl overflow-hidden px-1 w-[90%] mx-auto transition-all ${activeCardKey === "main_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "main"); }}>
                                        <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <span className="text-[8px] font-black w-3 text-center text-white">{count}</span>
                                    <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "main"); }}>
                                        <Plus className="w-2.5 h-2.5" />
                                    </button>
                                </div>

                                {/* Quantity badge with pulse animation */}
                                <motion.div 
                                    key={`count-${count}`}
                                    initial={{ scale: 1.5, opacity: 0.5 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute -top-2 -right-2 z-[120] bg-blue-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50"
                                >
                                    {count}
                                </motion.div>
                            </div>
                       </motion.div>
                   ))}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 h-[250px] min-h-[220px] shrink-0">
              {/* G-Zone */}
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col transition-all group">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-black text-[10px] text-emerald-400 uppercase tracking-tighter shadow-emerald-500/10 hover:text-emerald-300">G-Zone</h3>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-black text-emerald-400 border border-emerald-500/20">{currentDeck.gZone.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 content-start pb-8">
                        {groupedGZone.map(({card, count}) => (
                            <motion.div 
                                layout
                                key={card.id} 
                                className="relative aspect-[3/4] flex flex-col items-center"
                            >
                                <div 
                                    className="w-full h-full relative group shadow-sm rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all" 
                                    onClick={() => { setSelectedCard(card); addCard(card, "g"); }}
                                    onMouseEnter={() => { setSelectedCard(card); setActiveCardKey("g_" + card.id); }}
                                    onMouseLeave={() => setActiveCardKey(null)}
                                    onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "g"); }}
                                >
                                    <Card card={card} isStatic aspectRatio="aspect-[3/4]" />
                                    
                                    {/* Quantity controls appear only if actively hovered */}
                                    <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-lg overflow-hidden px-1 w-[95%] mx-auto transition-all ${activeCardKey === "g_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "g"); }}><Minus className="w-2 h-2" /></button>
                                        <span className="text-[7px] font-black w-2 text-center text-white">{count}</span>
                                        <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "g"); }}><Plus className="w-2 h-2" /></button>
                                    </div>

                                    {/* Quantity badge with pulse animation */}
                                    <motion.div 
                                        key={`count-${count}`}
                                        initial={{ scale: 1.5, opacity: 0.5 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute -top-2 -right-2 z-[120] bg-emerald-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50"
                                    >
                                        {count}
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
              </div>

              {/* Hyperspatial */}
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col transition-all group">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <h3 className="font-black text-[10px] text-purple-400 uppercase tracking-tighter hover:text-purple-300">Hyper</h3>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-black text-purple-400 border border-purple-500/20">{currentDeck.hyperspatial.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 content-start pb-8">
                        {groupedHyper.map(({card, count}) => (
                            <motion.div 
                                layout
                                key={`${card.name}-${card.image}`} 
                                className="relative aspect-[3/4] flex flex-col items-center"
                            >
                                <div 
                                    className="w-full h-full relative group shadow-sm rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all" 
                                    onClick={() => { setSelectedCard(card); addCard(card, "hyper"); }}
                                    onMouseEnter={() => { setSelectedCard(card); setActiveCardKey("hyper_" + card.id); }}
                                    onMouseLeave={() => setActiveCardKey(null)}
                                    onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "hyper"); }}
                                >
                                    <Card card={card} isStatic aspectRatio="aspect-[3/4]" />
                                    
                                    {/* Quantity controls appear only if actively hovered */}
                                    <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-lg overflow-hidden px-1 w-[95%] mx-auto transition-all ${activeCardKey === "hyper_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "hyper"); }}><Minus className="w-2 h-2" /></button>
                                        <span className="text-[7px] font-black w-2 text-center text-white">{count}</span>
                                        <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "hyper"); }}><Plus className="w-2 h-2" /></button>
                                    </div>

                                    {/* Quantity badge with pulse animation */}
                                    <motion.div 
                                        key={`count-${count}`}
                                        initial={{ scale: 1.5, opacity: 0.5 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="absolute -top-2 -right-2 z-[120] bg-purple-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50"
                                    >
                                        {count}
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
              </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

