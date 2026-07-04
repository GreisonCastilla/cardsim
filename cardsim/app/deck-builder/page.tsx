"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchCards, fetchDecks, saveDeck, deleteDeck, fetchCardsByNames, updateCard } from "../../lib/api";
import { GameCard, CardPosition, CardFace, PlayerId } from "../../store/gameStore";
import { Card } from "../../components/Card";
import { cn } from "../../lib/utils";
import { Search, ChevronLeft, ChevronRight, Save, Trash2, LayoutGrid, Layers, Zap, Info, Filter, Plus, Minus, FileText, Edit2, Check, ArrowUpRight, ExternalLink, Copy, ClipboardPaste, X as CloseIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../components/LanguageContext";

interface DeckData {
  id: string;
  name: string;
  mainDeck: GameCard[];
  gZone: GameCard[];
  hyperspatial: GameCard[];
  legendary: GameCard[];
}

export default function DeckBuilder() {
  const { language, t } = useLanguage();
  const [availableCards, setAvailableCards] = useState<GameCard[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState("1");
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    civ: [] as string[],
    type: [] as string[],
    cost: -1,
    power: -1,
    race: "",
    ability: [] as string[],
    rarity: "",
    set: ""
  });
  const [tempFilters, setTempFilters] = useState({
    civ: [] as string[],
    type: [] as string[],
    cost: -1,
    power: -1,
    race: "",
    ability: [] as string[],
    rarity: "",
    set: ""
  });
  const [availableSets, setAvailableSets] = useState<string[]>([]);

  // Multiple decks state
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string>("");

  // UI state
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [viewFaceIndex, setViewFaceIndex] = useState<number>(0);
  const [targetZone, setTargetZone] = useState<"main" | "g" | "hyper" | "legendary">("main");
  const [activeDeckTab, setActiveDeckTab] = useState<"main" | "g" | "hyper" | "legendary">("main");
  const [searchTab, setSearchTab] = useState<"all" | "doubleSided">("all");
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [originalIdentity, setOriginalIdentity] = useState<{ nameJa: string, image: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importUrl, setImportUrl] = useState("");

  // Editing state (Legacy text-only)
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editingDesc, setEditingDesc] = useState("");

  // Full Card Editing Modal state
  const [isEditingCardData, setIsEditingCardData] = useState(false);
  const [isAddingNewCard, setIsAddingNewCard] = useState(false);
  const [editingCardData, setEditingCardData] = useState<any>(null);
  const [clipboardCard, setClipboardCard] = useState<any>(null);
  const [clipboardFace, setClipboardFace] = useState<any>(null);
  const [wikiUrl, setWikiUrl] = useState("");
  const [isParsingWiki, setIsParsingWiki] = useState(false);
  const [stratRepresentations, setStratRepresentations] = useState<Record<string, GameCard>>({});
  const deduplicate = (val: string) => {
    if (!val) return val;
    let text = val.trim();
    
    // 1. Check for identical halves (e.g. "Water Water", "Double Breaker Double Breaker")
    const mid = Math.floor(text.length / 2);
    const firstHalf = text.substring(0, mid).trim();
    const secondHalf = text.substring(text.length - mid).trim();
    if (firstHalf === secondHalf && text.length > 3 && text.includes(" ")) {
      text = firstHalf;
    }

    // 2. Remove consecutive identical words (e.g. "Blocker Blocker", "Water Water Water")
    const words = text.split(/[\s\t\n]+/).filter(w => w.length > 0);
    const uniqueWords = [];
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i].toLowerCase() !== words[i-1].toLowerCase()) {
        uniqueWords.push(words[i]);
      }
    }
    
    return uniqueWords.join(" ");
  };

  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pastedWikiText, setPastedWikiText] = useState("");

  useEffect(() => {
    const savedCard = localStorage.getItem("cardsim_card_clipboard");
    if (savedCard) {
      try {
        setClipboardCard(JSON.parse(savedCard));
      } catch (e) { }
    }

    const savedFace = localStorage.getItem("cardsim_face_clipboard");
    if (savedFace) {
      try {
        setClipboardFace(JSON.parse(savedFace));
      } catch (e) { }
    }
  }, []);

  const startFullEdit = () => {
    if (selectedCard) {
      setEditingCardData(JSON.parse(JSON.stringify(selectedCard)));
      setOriginalIdentity({
        nameJa: selectedCard.nameJa || selectedCard.name || "",
        image: selectedCard.image || ""
      });
      setIsAddingNewCard(false);
      setIsEditingCardData(true);
    }
  };

  const startAddCard = () => {
    const newCard: any = {
      id: "new-" + Date.now(),
      name: "",
      nameEn: "",
      nameJa: "",
      image: "",
      civilization: "",
      mana: "",
      manaCost: "",
      attack: "",
      descriptionEn: "",
      descriptionJa: "",
      typeEn: "",
      typeJa: "",
      raceEn: "",
      raceJa: "",
      rarity: "",
      sets: [],
      source_url: "",
      backs: []
    };
    setWikiUrl("");
    setEditingCardData(newCard);
    setOriginalIdentity(null);
    setIsAddingNewCard(true);
    setIsEditingCardData(true);
    setIsPasteMode(false);
    setPastedWikiText("");
  };

  const handleParseWikiText = () => {
    const text = pastedWikiText || wikiUrl;
    if (!text.trim()) return;
    
    // already handled
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    

    const getField = (label: string) => {
      // Flexible regex: handles tabs, spaces, and singular/plural
      const regex = new RegExp(`^\\s*${label}s?:[\\s\\t]+(.*)$`, 'mi');
      const match = text.match(regex);
      if (match) return match[1].trim();
      
      const regexSpace = new RegExp(`^\\s*${label}s?:\\s+(.*)$`, 'mi');
      const matchSpace = text.match(regexSpace);
      return matchSpace ? matchSpace[1].trim() : "";
    };
    
    const getTextSection = (startLabel: string, endLabels: string[]) => {
      const startRegex = new RegExp(`${startLabel}:[\\s\\S]*?\\n([\\s\\S]*)`, 'i');
      const match = text.match(startRegex);
      if (!match) return "";
      
      let content = match[1];
      for (const end of endLabels) {
        const endRegex = new RegExp(`\\n\\s*${end}:`, 'i');
        const endMatch = content.match(endRegex);
        if (endMatch) {
          content = content.substring(0, endMatch.index);
        }
      }
      return content.trim();
    };

    const name = lines[0] || "";
    const nameJa = lines[1] || "";
    const civ = deduplicate(getField("Civilization"));
    const type = deduplicate(getField("Card Type"));
    const cost = getField("Mana Cost");
    const races = deduplicate(getField("Races"));
    const power = getField("Power");
    const hyperPower = getField("Hyper Power");
    const illustrator = getField("Illustrator");
    
    const abilitiesEn = deduplicate(getTextSection("English Text", ["Japanese Text", "Power", "Hyper Power", "Illustrator", "Sets and Rarity"]));
    const abilitiesJa = deduplicate(getTextSection("Japanese Text", ["Power", "Hyper Power", "Illustrator", "Sets and Rarity"]));

    let rarity = "";
    const rarityMatch = text.match(/—\s*(.*)/);
    if (rarityMatch) rarity = rarityMatch[1].trim();

    setEditingCardData((prev: any) => ({
      ...prev,
      name: name || prev.name,
      nameEn: name || prev.nameEn,
      nameJa: nameJa || prev.nameJa,
      manaCost: cost || prev.manaCost,
      mana: cost || prev.mana,
      attack: power || prev.attack,
      civilization: civ || prev.civilization,
      typeEn: type || prev.typeEn,
      raceEn: races || prev.raceEn,
      rarity: rarity || prev.rarity,
      illustrator: illustrator || prev.illustrator,
      descriptionEn: abilitiesEn || prev.descriptionEn,
      descriptionJa: abilitiesJa || prev.descriptionJa,
      hyperpower: hyperPower || prev.hyperpower
    }));
    
    setIsPasteMode(false);
    setPastedWikiText("");
  };

  const handleParseWiki = async (inputUrl?: any) => {
    // Check if inputUrl is a string (not a React event)
    const targetUrl = (typeof inputUrl === "string" ? inputUrl : null) || wikiUrl;
    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) return;
    setIsParsingWiki(true);
    try {
      const res = await fetch(`/api/wiki-parse?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setEditingCardData((prev: any) => ({
        ...prev,
        name: data.name || prev.name,
        nameEn: data.name || prev.nameEn,
        nameJa: data.name_ja || prev.nameJa,
        manaCost: data.cost || prev.manaCost,
        mana: data.cost || prev.mana,
        attack: data.power || prev.attack,
        civilization: deduplicate(data.civilization) || prev.civilization,
        typeEn: deduplicate(data.type) || prev.typeEn,
        raceEn: deduplicate(data.race) || prev.raceEn,
        rarity: data.rarity || prev.rarity,
        illustrator: data.illustrator || prev.illustrator,
        descriptionEn: deduplicate(data.abilities_en) || prev.descriptionEn,
        descriptionJa: deduplicate(data.abilities_ja) || prev.descriptionJa,
        hyperpower: deduplicate(data.hyper_power) || prev.hyperpower,
        image: data.image || prev.image,
        source_url: data.source_url || prev.source_url,
        primary_set: data.primary_set || prev.primary_set
      }));
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al leer de la Wiki.");
    } finally {
      setIsParsingWiki(false);
    }
  };

  const handleSmartImport = async () => {
    const input = wikiUrl.trim();
    if (!input) return;
    if (input.startsWith("http")) {
      await handleParseWiki(input);
    } else {
      setPastedWikiText(input);
      handleParseWikiText();
    }
    setWikiUrl("");
  };

  const saveFullEdit = async () => {
    if (!editingCardData) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      // Auto-sync fallback properties (immutably)
      const updatedCard = {
        ...editingCardData,
        name: editingCardData.nameEn || editingCardData.nameJa || "Unknown",
        description: editingCardData.descriptionEn || editingCardData.descriptionJa || ""
      };

      if (isAddingNewCard) {
        // CALL ADD API
        const { addCard } = await import("../../lib/api");
        await addCard(updatedCard);
        
        // Global refresh to sync everything
        await loadCards();
        
        // Select the newly added card
        setSelectedCard(updatedCard);
      } else {
        // Global persist to cards.json via backend
        await updateCard(updatedCard, originalIdentity || undefined);

        setSelectedCard(updatedCard);

        // Propagate to decks (preserving unique IDs)
        updateCurrentDeck(d => ({
          ...d,
          mainDeck: d.mainDeck.map(c => {
            const isMatch = c.id === updatedCard.id ||
              (originalIdentity && (c.nameJa === originalIdentity.nameJa || c.name === originalIdentity.nameJa) && c.image === originalIdentity.image);
            if (isMatch) {
              return { ...updatedCard, id: c.id };
            }
            return c;
          }),
          gZone: d.gZone.map(c => {
            const isMatch = c.id === updatedCard.id ||
              (originalIdentity && (c.nameJa === originalIdentity.nameJa || c.name === originalIdentity.nameJa) && c.image === originalIdentity.image);
            if (isMatch) {
              return { ...updatedCard, id: c.id };
            }
            return c;
          }),
          hyperspatial: d.hyperspatial.map(c => {
            const isMatch = c.id === updatedCard.id ||
              (originalIdentity && (c.nameJa === originalIdentity.nameJa || c.name === originalIdentity.nameJa) && c.image === originalIdentity.image);
            if (isMatch) {
              return { ...updatedCard, id: c.id };
            }
            return c;
          }),
          legendary: d.legendary.map(c => {
            const isMatch = c.id === updatedCard.id ||
              (originalIdentity && (c.nameJa === originalIdentity.nameJa || c.name === originalIdentity.nameJa) && c.image === originalIdentity.image);
            if (isMatch) {
              return { ...updatedCard, id: c.id };
            }
            return c;
          })
        }));
        
        // Global refresh to sync collection
        await loadCards();
      }

      setSaveStatus('success');
      setOriginalIdentity(null);
      setTimeout(() => {
        setIsEditingCardData(false);
        setIsAddingNewCard(false);
        setSaveStatus('idle');
      }, 800);
    } catch (err) {
      console.error("Persistence failed:", err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };


  const handleMoveBack = (index: number, direction: 'up' | 'down') => {
    if (!editingCardData || !editingCardData.backs) return;
    const newBacks = [...editingCardData.backs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newBacks.length) return;

    const temp = newBacks[index];
    newBacks[index] = newBacks[targetIndex];
    newBacks[targetIndex] = temp;

    setEditingCardData({ ...editingCardData, backs: newBacks });
  };

  const copyCardToClipboard = () => {
    if (editingCardData) {
      const dataToCopy = { ...editingCardData };
      // We don't want to copy the ID as that should remain unique to the card being edited
      delete dataToCopy.id;
      setClipboardCard(dataToCopy);
      localStorage.setItem("cardsim_card_clipboard", JSON.stringify(dataToCopy));
    }
  };

  const pasteCardFromClipboard = () => {
    if (clipboardCard && editingCardData) {
      const originalId = editingCardData.id;
      setEditingCardData({
        ...clipboardCard,
        id: originalId
      });
    }
  };

  const copyFaceToClipboard = (isMain: boolean, index: number = 0) => {
    if (!editingCardData) return;
    let faceData: any = {};

    if (isMain) {
      faceData = {
        name: editingCardData.nameEn || editingCardData.nameJa || "",
        image_url: editingCardData.image || "",
        cost: editingCardData.manaCost || "",
        power: editingCardData.attack || "",
        civilization: editingCardData.civilization || "",
        abilities_en: editingCardData.descriptionEn || "",
        abilities_ja: editingCardData.descriptionJa || "",
        type_en: editingCardData.typeEn || "",
        race_en: editingCardData.raceEn || "",
        type_ja: editingCardData.typeJa || "",
        race_ja: editingCardData.raceJa || ""
      };
    } else if (editingCardData.backs && editingCardData.backs[index]) {
      faceData = { ...editingCardData.backs[index] };
    }

    setClipboardFace(faceData);
    localStorage.setItem("cardsim_face_clipboard", JSON.stringify(faceData));
  };

  const pasteFaceFromClipboard = (isMain: boolean, index: number = 0) => {
    if (!clipboardFace || !editingCardData) return;

    if (isMain) {
      setEditingCardData({
        ...editingCardData,
        nameEn: clipboardFace.name || clipboardFace.nameEn || "",
        nameJa: clipboardFace.name || clipboardFace.nameJa || "",
        image: clipboardFace.image_url || clipboardFace.image || "",
        manaCost: clipboardFace.cost || clipboardFace.manaCost || "",
        attack: clipboardFace.power || clipboardFace.attack || "",
        civilization: clipboardFace.civilization || "",
        descriptionEn: clipboardFace.abilities_en || clipboardFace.descriptionEn || "",
        descriptionJa: clipboardFace.abilities_ja || clipboardFace.descriptionJa || "",
        typeEn: clipboardFace.type_en || clipboardFace.typeEn || "",
        typeJa: clipboardFace.type_ja || clipboardFace.typeJa || "",
        raceEn: clipboardFace.race_en || clipboardFace.raceEn || "",
        raceJa: clipboardFace.race_ja || clipboardFace.raceJa || ""
      });
    } else {
      const newBacks = [...(editingCardData.backs || [])];
      newBacks[index] = {
        name: clipboardFace.name || clipboardFace.nameEn || "",
        image_url: clipboardFace.image_url || clipboardFace.image || "",
        cost: clipboardFace.cost || clipboardFace.manaCost || "",
        power: clipboardFace.power || clipboardFace.attack || "",
        civilization: clipboardFace.civilization || "",
        abilities_en: clipboardFace.abilities_en || clipboardFace.descriptionEn || "",
        abilities_ja: clipboardFace.abilities_ja || clipboardFace.descriptionJa || "",
        type_en: clipboardFace.type_en || clipboardFace.typeEn || "",
        race_en: clipboardFace.race_en || clipboardFace.raceEn || "",
        type_ja: clipboardFace.type_ja || clipboardFace.typeJa || "",
        race_ja: clipboardFace.race_ja || clipboardFace.raceJa || ""
      };
      setEditingCardData({ ...editingCardData, backs: newBacks });
    }
  };


  useEffect(() => {
    fetch('/sets_order.json')
      .then(res => res.json())
      .then(data => setAvailableSets(data))
      .catch(() => { });

    const initDecks = async () => {
      // First try backend
      try {
        const token = localStorage.getItem("cardsim_token");
        if (token) {
          const backendDecks = await fetchDecks();
          if (backendDecks && backendDecks.length > 0) {
            const mapped: DeckData[] = backendDecks.map(d => ({
              id: d.id.toString(),
              name: d.name,
              mainDeck: d.main_deck || [],
              gZone: d.g_zone || [],
              hyperspatial: d.hyperspatial || [],
              legendary: d.legendary || []
            }));
            setDecks(mapped);
            setCurrentDeckId(mapped[0].id);
            return;
          } else {
            // Authenticated but no decks, create a default one in backend
            await saveDeck({ name: "Mi Primer Mazo", main_deck: [], g_zone: [], hyperspatial: [], legendary: [] });
            const newBackendDecks = await fetchDecks();
            if (newBackendDecks && newBackendDecks.length > 0) {
              const mapped: DeckData[] = newBackendDecks.map(d => ({
                id: d.id.toString(),
                name: d.name,
                mainDeck: d.main_deck || [],
                gZone: d.g_zone || [],
                hyperspatial: d.hyperspatial || [],
                legendary: d.legendary || []
              }));
              setDecks(mapped);
              setCurrentDeckId(mapped[0].id);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Backend fetch failed, falling back to local:", err);
      }

      // Fallback to local
      const saved = localStorage.getItem("cardsim_decks");
      if (saved) {
        const parsed = JSON.parse(saved);
        setDecks(parsed);
        if (parsed.length > 0) setCurrentDeckId(parsed[0].id);
      } else {
        const defaultDeck = { id: "deck_1", name: "Mi Primer Mazo", mainDeck: [], gZone: [], hyperspatial: [], legendary: [] };
        setDecks([defaultDeck]);
        setCurrentDeckId(defaultDeck.id);
      }
    };
    initDecks();
  }, []);

  useEffect(() => {
    const prefetchStrats = async () => {
      const names = ["Forbidden ~The Sealed X~", "FORBIDDEN STAR ~World's Last Day~", "Zerom, Origin of Destruction"];
      try {
        const cardMap = await fetchCardsByNames(names);
        const mapped: Record<string, GameCard> = {};
        names.forEach(name => {
          const cardData = cardMap[name.toLowerCase()];
          if (cardData) {
            mapped[name.toLowerCase()] = {
              id: `strat_rep_${name}`,
              name: cardData.name_en || cardData.name_ja || "Unknown Card",
              nameJa: cardData.name_ja,
              nameEn: cardData.name_en,
              image: cardData.image_url,
              description: cardData.abilities_en || cardData.abilities_ja || "",
              descriptionJa: cardData.abilities_ja,
              descriptionEn: cardData.abilities_en,
              manaCost: cardData.cost || cardData.mana || "-",
              attack: cardData.power || "-",
              civilization: cardData.civilization || "",
              raceEn: cardData.race_en || "",
              raceJa: cardData.race_ja || "",
              typeEn: cardData.type_en || "",
              typeJa: cardData.type_ja || "",
              primary_set: cardData.primary_set || "",
              rarity: cardData.rarity || "",
              illustrator: cardData.illustrator || "",
              mana: cardData.mana || "",
              hyperpower: cardData.hyperpower || "",
              source_url: cardData.source_url || "",
              sets: cardData.sets || [],
              color: "#3b82f6",
              position: "vertical" as CardPosition,
              face: "up" as CardFace,
              owner: "p1" as PlayerId,
              underlyingCards: [],
              backs: cardData.backs || []
            };
          }
        });
        setStratRepresentations(mapped);
      } catch (e) {
        console.error("Failed to prefetch strategy representations:", e);
      }
    };
    prefetchStrats();
  }, []);

  const currentDeck = useMemo(() => decks.find(d => d.id === currentDeckId) || { id: "err", name: "Error", mainDeck: [], gZone: [], hyperspatial: [], legendary: [] }, [decks, currentDeckId]);

  const updateCurrentDeck = (updateFn: (d: DeckData) => DeckData) => {
    setDecks(prev => {
      const newDecks = prev.map(d => d.id === currentDeckId ? updateFn(d) : d);
      localStorage.setItem("cardsim_decks", JSON.stringify(newDecks));
      return newDecks;
    });
  };

  const loadCards = useCallback(async () => {
    try {
      const currentLimit = searchTab === 'doubleSided' ? limit : limit;
      const data = await fetchCards(q, page, currentLimit, language, { ...filters, doubleSided: searchTab === 'doubleSided' });

      // Safety filter: ensure ONLY cards with backs are shown in the specialized tab
      const rawCards = data.cards || [];
      const filteredResults = searchTab === 'doubleSided'
        ? rawCards.filter((c: any) => c.backs && c.backs.length > 0)
        : rawCards;

      const mapped = filteredResults.map((c: any, i: number) => ({
        id: `db_${c.name_ja || ''}_${c.name_en || ''}_${i}`,
        name: c.name_en || c.name_ja || "Unknown Card",
        nameJa: c.name_ja,
        nameEn: c.name_en,
        image: c.image_url,
        description: c.abilities_en || c.abilities_ja || "",
        descriptionJa: c.abilities_ja,
        descriptionEn: c.abilities_en,
        manaCost: c.cost || c.mana || "-",
        attack: c.power || "-",
        civilization: c.civilization || "",
        raceEn: c.race_en || "",
        raceJa: c.race_ja || "",
        typeEn: c.type_en || "",
        typeJa: c.type_ja || "",
        primary_set: c.primary_set || "",
        rarity: c.rarity || "",
        illustrator: c.illustrator || "",
        mana: c.mana || "",
        hyperpower: c.hyperpower || "",
        source_url: c.source_url || "",
        sets: c.sets || [],
        color: "#3b82f6",
        position: "vertical" as CardPosition,
        face: "up" as CardFace,
        owner: "p1" as PlayerId,
        underlyingCards: [],
        backs: c.backs || []
      }));
      setAvailableCards(mapped);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    }
  }, [q, page, filters, language, searchTab, limit]);

  useEffect(() => {
    setPage(1);
  }, [q, filters, searchTab]);

  useEffect(() => {
    loadCards();
  }, [page, loadCards]);

  useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  const totalPages = Math.ceil(total / (searchTab === 'doubleSided' ? limit : limit));

  const handleStartEdit = () => {
    if (!selectedCard) return;
    const isBack = viewFaceIndex > 0;
    const activeFace = isBack && selectedCard.backs && selectedCard.backs.length >= viewFaceIndex
      ? selectedCard.backs[viewFaceIndex - 1]
      : null;

    // Get the current description we are seeing
    const desc = isBack && activeFace
      ? (language === 'ja' ? activeFace.abilities_ja : activeFace.abilities_en) || activeFace.abilities_en || activeFace.abilities_ja
      : (language === 'ja' ? selectedCard.descriptionJa : selectedCard.descriptionEn) || selectedCard.description;

    setEditingDesc(desc || "");
    setIsEditingDesc(true);
  };

  const handleSaveDesc = () => {
    if (!selectedCard) return;
    const isBack = viewFaceIndex > 0;

    // Create a deep copy to avoid mutations directly if possible, though React state handles it
    const updatedCard = { ...selectedCard };

    if (isBack && updatedCard.backs && updatedCard.backs.length >= viewFaceIndex) {
      const back = { ...updatedCard.backs[viewFaceIndex - 1] };
      if (language === 'ja') back.abilities_ja = editingDesc;
      else back.abilities_en = editingDesc;
      updatedCard.backs[viewFaceIndex - 1] = back;
    } else {
      if (language === 'ja') updatedCard.descriptionJa = editingDesc;
      else updatedCard.descriptionEn = editingDesc;
      updatedCard.description = editingDesc; // Sync fallback
    }

    setSelectedCard(updatedCard);

    // Propagate to availableCards
    setAvailableCards(prev => prev.map(c => c.nameJa === updatedCard.nameJa && c.image === updatedCard.image ? { ...c, ...updatedCard } : c));

    // Propagate to current deck
    updateCurrentDeck(d => ({
      ...d,
      mainDeck: d.mainDeck.map(c => c.nameJa === updatedCard.nameJa && c.image === updatedCard.image ? { ...c, ...updatedCard } : c),
      gZone: d.gZone.map(c => c.nameJa === updatedCard.nameJa && c.image === updatedCard.image ? { ...c, ...updatedCard } : c),
      hyperspatial: d.hyperspatial.map(c => c.nameJa === updatedCard.nameJa && c.image === updatedCard.image ? { ...c, ...updatedCard } : c),
      legendary: d.legendary.map(c => c.nameJa === updatedCard.nameJa && c.image === updatedCard.image ? { ...c, ...updatedCard } : c)
    }));

    setIsEditingDesc(false);

    // Global persist to cards.json via backend
    updateCard(updatedCard).catch(err => console.error("Persistence failed:", err));
  };

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

  const addCard = (cardData: GameCard, zone: "main" | "g" | "hyper" | "legendary") => {
    const newCard = { ...cardData, id: `deck_${Date.now()}_${Math.random()}` };
    updateCurrentDeck(d => {
      if (zone === "main") return { ...d, mainDeck: [...d.mainDeck, newCard] };
      if (zone === "g") return { ...d, gZone: [...d.gZone, newCard] };
      if (zone === "hyper") return { ...d, hyperspatial: [...d.hyperspatial, newCard] };
      return { ...d, legendary: [...d.legendary, newCard] };
    });
  };

  const removeGroupedCard = (cardData: GameCard, zone: "main" | "g" | "hyper" | "legendary") => {
    updateCurrentDeck(d => {
      let targetZone = zone === "main" ? d.mainDeck : zone === "g" ? d.gZone : zone === "hyper" ? d.hyperspatial : d.legendary;
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
        if (zone === "hyper") return { ...d, hyperspatial: newZ };
        return { ...d, legendary: newZ };
      }
      return d;
    });
  };

  const createNewDeck = async () => {
    const name = `Nuevo Mazo ${decks.length + 1}`;

    const newDeck = { id: `deck_${Date.now()}`, name, mainDeck: [], gZone: [], hyperspatial: [], legendary: [] };
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

  const handleImportList = async () => {
    if (!importText.trim()) return;
    setIsSaving(true);
    try {
      const lines = importText.split('\n');
      const cardNamesToFetch: string[] = [];
      const parsedLines: { count: number, name: string }[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

        // Match count and name, e.g. "4 Aqua Hulcus" or "Aqua Hulcus"
        const match = trimmed.match(/^(\d+)?\s*(.+)$/);
        if (match) {
          const count = match[1] ? parseInt(match[1]) : 1;
          const name = match[2].trim();
          parsedLines.push({ count, name });
          cardNamesToFetch.push(name);
        }
      }

      const cardMap = await fetchCardsByNames(cardNamesToFetch);

      const newMainCards: GameCard[] = [];
      const newGZoneCards: GameCard[] = [];
      const newHyperCards: GameCard[] = [];
      const newLegendaryCards: GameCard[] = [];

      parsedLines.forEach(({ count, name }) => {
        const cardData = cardMap[name.toLowerCase()];
        if (!cardData) {
          console.warn(`Card not found: ${name}`);
          return;
        }

        // Determine zone based on type (simple heuristic or we could refine)
        const typeEn = (cardData.type_en || "").toLowerCase();
        const isPsychic = typeEn.includes("psychic") || typeEn.includes("dragheart");
        const isGacharange = typeEn.includes("gacharange");
        const isLegendary = typeEn.includes("forbidden") || typeEn.includes("zeron") || name.toLowerCase().includes("zerom");

        let target = "main";
        if (isLegendary) target = "legendary";
        else if (isPsychic) target = "hyper";
        else if (isGacharange) target = "g";

        for (let i = 0; i < count; i++) {
          const gc: GameCard = {
            id: `import_${Date.now()}_${Math.random()}`,
            name: cardData.name_en || cardData.name_ja || "Unknown Card",
            nameJa: cardData.name_ja,
            nameEn: cardData.name_en,
            image: cardData.image_url,
            description: cardData.abilities_en || cardData.abilities_ja || "",
            descriptionJa: cardData.abilities_ja,
            descriptionEn: cardData.abilities_en,
            manaCost: cardData.cost || cardData.mana || "-",
            attack: cardData.power || "-",
            civilization: cardData.civilization || "",
            raceEn: cardData.race_en || "",
            raceJa: cardData.race_ja || "",
            typeEn: cardData.type_en || "",
            typeJa: cardData.type_ja || "",
            primary_set: cardData.primary_set || "",
            rarity: cardData.rarity || "",
            illustrator: cardData.illustrator || "",
            mana: cardData.mana || "",
            hyperpower: cardData.hyperpower || "",
            source_url: cardData.source_url || "",
            sets: cardData.sets || [],
            color: "#3b82f6",
            position: "vertical" as CardPosition,
            face: "up" as CardFace,
            owner: "p1" as PlayerId,
            underlyingCards: [],
            backs: cardData.backs || []
          };
          if (target === "main") newMainCards.push(gc);
          else if (target === "g") newGZoneCards.push(gc);
          else if (target === "hyper") newHyperCards.push(gc);
          else newLegendaryCards.push(gc);
        }
      });

      updateCurrentDeck(d => ({
        ...d,
        mainDeck: [...d.mainDeck, ...newMainCards],
        gZone: [...d.gZone, ...newGZoneCards],
        hyperspatial: [...d.hyperspatial, ...newHyperCards],
        legendary: [...d.legendary, ...newLegendaryCards]
      }));

      setIsImporting(false);
      setImportText("");
    } catch (err) {
      console.error(err);
      alert("Error al importar el mazo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setIsSaving(true);
    try {
      // Extract ID from URL
      let deckId = "";
      if (importUrl.includes('tcgrevo_deck_maker_deck_id=')) {
        deckId = importUrl.split('tcgrevo_deck_maker_deck_id=')[1].split('&')[0];
      } else if (importUrl.includes('deck-maker.com/dm/deck/')) {
        deckId = importUrl.split('deck-maker.com/dm/deck/')[1].split('/')[0];
      }

      if (!deckId) throw new Error("Could not find Deck ID in URL");

      const res = await fetch(`/api/import-deck?deckId=${deckId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch deck from proxy");
      }

      const data = await res.json();

      // Fetch actual card data for each part
      const fetchList = async (list: { name: string, count: number }[]) => {
        if (!list || list.length === 0) return [];
        const names = list.map(l => l.name);
        const cardMap = await fetchCardsByNames(names);
        const results: GameCard[] = [];

        list.forEach(({ name, count }) => {
          const cardData = cardMap[name.toLowerCase()];
          if (!cardData) {
            console.warn("Card not found during URL import:", name);
            return;
          }
          for (let i = 0; i < count; i++) {
            results.push({
              id: `import_${Date.now()}_${Math.random()}`,
              name: cardData.name_en || cardData.name_ja || "Unknown Card",
              nameJa: cardData.name_ja,
              nameEn: cardData.name_en,
              image: cardData.image_url,
              description: cardData.abilities_en || cardData.abilities_ja || "",
              descriptionJa: cardData.abilities_ja,
              descriptionEn: cardData.abilities_en,
              manaCost: cardData.cost || cardData.mana || "-",
              attack: cardData.power || "-",
              civilization: cardData.civilization || "",
              raceEn: cardData.race_en || "",
              raceJa: cardData.race_ja || "",
              typeEn: cardData.type_en || "",
              typeJa: cardData.type_ja || "",
              primary_set: cardData.primary_set || "",
              rarity: cardData.rarity || "",
              illustrator: cardData.illustrator || "",
              mana: cardData.mana || "",
              hyperpower: cardData.hyperpower || "",
              source_url: cardData.source_url || "",
              sets: cardData.sets || [],
              color: "#3b82f6",
              position: "vertical" as CardPosition,
              face: "up" as CardFace,
              owner: "p1" as PlayerId,
              underlyingCards: [],
              backs: cardData.backs || []
            });
          }
        });
        return results;
      };

      const [main, g, hyper, legendary] = await Promise.all([
        fetchList(data.main),
        fetchList(data.g),
        fetchList(data.hyper),
        fetchList(data.legendary)
      ]);

      updateCurrentDeck(d => ({
        ...d,
        mainDeck: [...d.mainDeck, ...main],
        gZone: [...d.gZone, ...g],
        hyperspatial: [...d.hyperspatial, ...hyper],
        legendary: [...d.legendary, ...legendary]
      }));

      setIsImporting(false);
      setImportUrl("");

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al importar el mazo.");
    } finally {
      setIsSaving(false);
    }
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
        hyperspatial: currentDeck.hyperspatial,
        legendary: currentDeck.legendary
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
            hyperspatial: d.hyperspatial || [],
            legendary: d.legendary || []
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
  const groupedLegendary = groupCards(currentDeck.legendary);

  const applyStrategy = async (names: string[]) => {
    setIsSaving(true);
    try {
      const cardMap = await fetchCardsByNames(names);
      const newLegendaryCards: GameCard[] = [];

      names.forEach(name => {
        const cardData = cardMap[name.toLowerCase()];
        if (cardData) {
          newLegendaryCards.push({
            id: `strat_${Date.now()}_${Math.random()}`,
            name: cardData.name_en || cardData.name_ja || "Unknown Card",
            nameJa: cardData.name_ja,
            nameEn: cardData.name_en,
            image: cardData.image_url,
            description: cardData.abilities_en || cardData.abilities_ja || "",
            descriptionJa: cardData.abilities_ja,
            descriptionEn: cardData.abilities_en,
            manaCost: cardData.cost || cardData.mana || "-",
            attack: cardData.power || "-",
            civilization: cardData.civilization || "",
            raceEn: cardData.race_en || "",
            raceJa: cardData.race_ja || "",
            typeEn: cardData.type_en || "",
            typeJa: cardData.type_ja || "",
            primary_set: cardData.primary_set || "",
            rarity: cardData.rarity || "",
            illustrator: cardData.illustrator || "",
            mana: cardData.mana || "",
            hyperpower: cardData.hyperpower || "",
            source_url: cardData.source_url || "",
            sets: cardData.sets || [],
            color: "#3b82f6",
            position: "vertical" as CardPosition,
            face: "up" as CardFace,
            owner: "p1" as PlayerId,
            underlyingCards: [],
            backs: cardData.backs || []
          });
        }
      });

      updateCurrentDeck(d => ({
        ...d,
        legendary: newLegendaryCards
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30 overflow-hidden flex h-screen text-sm border-t border-white/5">
      {/* Details Panel - Sidebar */}
      <aside className="w-[300px] xl:w-[320px] 2xl:w-[350px] shrink-0 h-full flex flex-col overflow-hidden border-r border-white/5 bg-slate-900/60 backdrop-blur-xl">
        <div className="p-5 flex-1 flex flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-left-4">
          {selectedCard ? (
            (() => {
              const isBack = viewFaceIndex > 0;
              const activeFace = isBack && selectedCard.backs && selectedCard.backs.length >= viewFaceIndex
                ? selectedCard.backs[viewFaceIndex - 1]
                : null;
              const resolveImage = (cardOrFace: any, isBackFace: boolean) => {
                if (cardOrFace.preferredImageUrl) return cardOrFace.preferredImageUrl;
                const rawUrl = isBackFace ? cardOrFace.image_url : cardOrFace.image;
                if (!rawUrl) return null;
                const urls = rawUrl.includes('\n') ? rawUrl.split('\n') : rawUrl.includes(',') ? rawUrl.split(',') : [rawUrl];
                return urls[0] || null;
              };
              const img = isBack && activeFace ? resolveImage(activeFace, true) : resolveImage(selectedCard, false);
              const nameJa = isBack && activeFace ? "" : selectedCard.nameJa;
              const nameEn = isBack && activeFace ? activeFace.name : selectedCard.nameEn;
              const name = isBack && activeFace ? activeFace.name : selectedCard.name;
              const displayName = nameJa && nameEn ? (language === 'ja' ? nameJa : nameEn) : name;

              const mana = isBack && activeFace ? activeFace.cost || activeFace.mana || "-" : selectedCard.manaCost;
              const power = isBack && activeFace ? activeFace.power || "-" : selectedCard.attack;

              const descJa = isBack && activeFace ? activeFace.abilities_ja : selectedCard.descriptionJa;
              const descEn = isBack && activeFace ? activeFace.abilities_en : selectedCard.descriptionEn;
              const fallBackDesc = isBack && activeFace ? activeFace.abilities_ja || activeFace.abilities_en : selectedCard.description;

              const totalFaces = 1 + (selectedCard.backs ? selectedCard.backs.length : 0);

              const race = isBack && activeFace
                ? (language === 'ja' ? activeFace.race_ja || activeFace.race_en : activeFace.race_en || activeFace.race_ja)
                : (language === 'ja' ? selectedCard.raceJa || selectedCard.raceEn : selectedCard.raceEn || selectedCard.raceJa);

              const cardType = isBack && activeFace
                ? (language === 'ja' ? activeFace.type_ja || activeFace.type_en : activeFace.type_en || activeFace.type_ja)
                : (language === 'ja' ? selectedCard.typeJa || selectedCard.typeEn : selectedCard.typeEn || selectedCard.typeJa);

              const rarity = selectedCard.rarity;

              return (
                <div className="flex flex-col gap-4 overflow-hidden flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Card Image Frame */}
                  <div className="w-full max-w-[220px] aspect-[5/7] shrink-0 transition-all hover:scale-[1.04] duration-500 group relative mx-auto flex items-center justify-center p-1 bg-gradient-to-br from-white/10 to-transparent rounded-xl shadow-2xl">
                    <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {img ? (
                      <img
                        src={img}
                        alt={name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl relative z-10"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950/80 rounded-lg flex flex-col items-center justify-center border border-white/5 relative z-10">
                        <Layers className="w-8 h-8 text-slate-700 mb-2" />
                        <span className="text-slate-600 text-[10px] uppercase font-black tracking-widest">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Info Frame */}
                  <div className="flex-1 overflow-hidden flex flex-col gap-3 bg-slate-950/40 border border-white/10 rounded-2xl p-4 shadow-inner backdrop-blur-md">
                    {/* Header Section */}
                    <div className="flex flex-col gap-2 relative">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col flex-1 gap-0.5">
                          <h3 className="text-[13px] font-black text-white leading-tight uppercase tracking-tight line-clamp-2">{displayName}</h3>
                          {race && (
                            <span className="text-[9px] font-black text-emerald-400/90 leading-none uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              {race}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 items-center shrink-0">
                          {selectedCard.source_url && (
                            <a
                              href={selectedCard.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-white/5"
                              title={t("Wikiを表示", "View Wiki")}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {totalFaces > 1 && (
                            <button
                              onClick={() => setViewFaceIndex((viewFaceIndex + 1) % totalFaces)}
                              className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-500/20 flex items-center gap-1 text-[10px] font-black"
                              title={t("面を切り替える", "Flip Card")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                              <span>{viewFaceIndex + 1}/{totalFaces}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {cardType && (
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm">
                            {cardType}
                          </span>
                        )}
                        {rarity && !isBack && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm">
                            {rarity}
                          </span>
                        )}
                      </div>
                    </div>


                    {/* Ability Section */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{t("アビリティ", "Abilities")}</span>
                        {!isEditingDesc ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={startFullEdit}
                              className="p-1 hover:bg-slate-800 rounded-md text-amber-500/70 hover:text-amber-400 transition-all"
                              title={t("全編集", "Full Edit")}
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleStartEdit}
                              className="p-1 hover:bg-slate-800 rounded-md text-blue-500/70 hover:text-blue-400 transition-all"
                              title={t("編集", "Edit Text")}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={handleSaveDesc}
                              className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md text-emerald-400 transition-all border border-emerald-500/20"
                              title={t("保存", "Save")}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setIsEditingDesc(false)}
                              className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-400 transition-all border border-red-500/20"
                              title={t("キャンセル", "Cancel")}
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 relative min-h-0">
                        {isEditingDesc ? (
                          <textarea
                            value={editingDesc}
                            onChange={(e) => setEditingDesc(e.target.value)}
                            className="w-full h-full text-[11px] text-white leading-relaxed bg-slate-950/80 p-3 rounded-xl border-2 border-blue-500/30 focus:outline-none focus:border-blue-500 transition-all custom-scrollbar font-medium resize-none shadow-2xl"
                            autoFocus
                          />
                        ) : (
                          <div className="w-full h-full text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-white/5 whitespace-pre-wrap overflow-y-auto custom-scrollbar font-medium shadow-inner group/desc relative scroll-smooth">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none opacity-50" />
                            <div className="relative z-10">
                              {t(descJa || fallBackDesc, descEn || fallBackDesc)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center border border-white/5 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 animate-pulse"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("カードが選択されていません", "No card selected")}</p>
                <p className="text-[10px] text-slate-500 font-medium">{t("詳細を表示するにはカードをクリックしてください。", "Click a card to view its details here.")}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl p-4 border-b border-white/5 shrink-0">
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
              <button
                onClick={() => setIsImporting(true)}
                className="p-2 bg-slate-700/30 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border border-white/10"
                title={t("リストからロード", "Load from List")}
              >
                <FileText className="w-4 h-4" />
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

        <main className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
          {/* Deck Construction Zones (Right Panel) */}
          <section className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col overflow-hidden h-full border-r border-white/5">
            <div className="bg-slate-900/20 flex-1 flex flex-col overflow-hidden backdrop-blur-md">
              {/* Tabs Trigger */}
              <div className="flex items-center gap-1 p-2 bg-slate-900/60 border-b border-white/5">
                {[
                  { id: "main", label: t("メインデッキ", "Main Deck"), icon: <Zap className="w-3.5 h-3.5" />, color: "text-blue-400", count: currentDeck.mainDeck.length },
                  { id: "g", label: "G-Zone", icon: <Layers className="w-3.5 h-3.5" />, color: "text-emerald-400", count: currentDeck.gZone.length },
                  { id: "hyper", label: "Hyper", icon: <Zap className="w-3.5 h-3.5" />, color: "text-purple-400", count: currentDeck.hyperspatial.length },
                  { id: "legendary", label: t("レジェンド", "Legendary"), icon: <Info className="w-3.5 h-3.5" />, color: "text-orange-400", count: currentDeck.legendary.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveDeckTab(tab.id as any); setTargetZone(tab.id as any); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider relative group",
                      activeDeckTab === tab.id
                        ? "bg-slate-800 text-white shadow-lg ring-1 ring-white/10"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                    )}
                  >
                    <span className={cn(activeDeckTab === tab.id ? tab.color : "text-slate-600 group-hover:text-slate-400")}>{tab.icon}</span>
                    {tab.label}
                    <div className={cn(
                      "ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black min-w-[18px] text-center shrink-0",
                      activeDeckTab === tab.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
                    )}>
                      {tab.count}
                    </div>
                    {activeDeckTab === tab.id && (
                      <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 inset-x-2 h-[2px] bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {/* Standard card zones share the same grid layout */}
                {(activeDeckTab === "main" || activeDeckTab === "g" || activeDeckTab === "hyper") && (
                  <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 2xl:grid-cols-12 gap-4 content-start pb-8">
                    {activeDeckTab === "main" && groupedMain.map(({ card, count }) => (
                      <motion.div
                        layout
                        key={card.id}
                        className="relative aspect-[3/4] flex flex-col items-center"
                      >
                        <div
                          className="w-full h-full relative group shadow-md rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all"
                          onClick={() => { setSelectedCard(card); setViewFaceIndex(0); addCard(card, "main"); }}
                          onMouseEnter={() => { setSelectedCard(card); setViewFaceIndex(0); setActiveCardKey("main_" + card.id); }}
                          onMouseLeave={() => setActiveCardKey(null)}
                          onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "main"); }}
                        >
                          <Card card={card} isStatic />
                          <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-xl overflow-hidden px-1 w-[90%] mx-auto transition-all ${activeCardKey === "main_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "main"); }}><Minus className="w-2.5 h-2.5" /></button>
                            <span className="text-[8px] font-black w-3 text-center text-white">{count}</span>
                            <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "main"); }}><Plus className="w-2.5 h-2.5" /></button>
                          </div>
                          <motion.div key={`count-${count}`} initial={{ scale: 1.5, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="absolute -top-2 -right-2 z-[120] bg-blue-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50">{count}</motion.div>
                        </div>
                      </motion.div>
                    ))}

                    {activeDeckTab === "g" && groupedGZone.map(({ card, count }) => (
                      <motion.div
                        layout
                        key={card.id}
                        className="relative aspect-[3/4] flex flex-col items-center"
                      >
                        <div
                          className="w-full h-full relative group shadow-md rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all"
                          onClick={() => { setSelectedCard(card); setViewFaceIndex(0); addCard(card, "g"); }}
                          onMouseEnter={() => { setSelectedCard(card); setViewFaceIndex(0); setActiveCardKey("g_" + card.id); }}
                          onMouseLeave={() => setActiveCardKey(null)}
                          onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "g"); }}
                        >
                          <Card card={card} isStatic />
                          <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-xl overflow-hidden px-1 w-[90%] mx-auto transition-all ${activeCardKey === "g_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "g"); }}><Minus className="w-2.5 h-2.5" /></button>
                            <span className="text-[8px] font-black w-3 text-center text-white">{count}</span>
                            <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "g"); }}><Plus className="w-2.5 h-2.5" /></button>
                          </div>
                          <motion.div key={`count-${count}`} initial={{ scale: 1.5, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="absolute -top-2 -right-2 z-[120] bg-emerald-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50">{count}</motion.div>
                        </div>
                      </motion.div>
                    ))}

                    {activeDeckTab === "hyper" && groupedHyper.map(({ card, count }) => (
                      <motion.div
                        layout
                        key={card.id}
                        className="relative aspect-[3/4] flex flex-col items-center"
                      >
                        <div
                          className="w-full h-full relative group shadow-md rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all"
                          onClick={() => { setSelectedCard(card); setViewFaceIndex(0); addCard(card, "hyper"); }}
                          onMouseEnter={() => { setSelectedCard(card); setViewFaceIndex(0); setActiveCardKey("hyper_" + card.id); }}
                          onMouseLeave={() => setActiveCardKey(null)}
                          onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "hyper"); }}
                        >
                          <Card card={card} isStatic />
                          <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-xl overflow-hidden px-1 w-[90%] mx-auto transition-all ${activeCardKey === "hyper_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "hyper"); }}><Minus className="w-2.5 h-2.5" /></button>
                            <span className="text-[8px] font-black w-3 text-center text-white">{count}</span>
                            <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "hyper"); }}><Plus className="w-2.5 h-2.5" /></button>
                          </div>
                          <motion.div key={`count-${count}`} initial={{ scale: 1.5, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="absolute -top-2 -right-2 z-[120] bg-purple-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50">{count}</motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeDeckTab === "legendary" && (
                  currentDeck.legendary.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 py-12">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 justify-items-center items-center w-full max-w-5xl">
                        {[
                          {
                            name: "Forbidden ~The Sealed X~",
                            cards: ["Forbidden ~The Sealed X~"],
                            img: "https://static.wikia.nocookie.net/duelmasters/images/5/58/Dm25ex4-tr4a.jpg/revision/latest?cb=20260207101206",
                            id: "strat-dorma"
                          },
                          {
                            name: "FORBIDDEN STAR",
                            cards: [
                              "FORBIDDEN STAR ~World's Last Day~",
                              "Forbidden ~Awakening of Destruction~",
                              "Forbidden ~Awakening of Sealing~",
                              "Forbidden ~Awakening of Black~",
                              "Forbidden ~Dawn of Awakening~"
                            ],
                            img: "https://static.wikia.nocookie.net/duelmasters/images/e/e2/Dmr23-ffl1%2B2%2B3%2B4%2B5a.jpg/revision/latest?cb=20161216210147",
                            id: "strat-star"
                          },
                          {
                            name: "ZEROM",
                            cards: ["Zerom, Origin of Destruction", "Ceremony of Graveyard", "Ceremony of Hands", "Ceremony of Resurrection", "Ceremony of Destruction"],
                            img: "https://static.wikia.nocookie.net/duelmasters/images/4/48/Dmbd22-mz1a.jpg/revision/latest?cb=20220802114004",
                            id: "strat-zerom"
                          }
                        ].map(strat => (
                          <div key={strat.id} className="flex flex-col items-center gap-4 group">
                            <motion.div
                              whileHover={{ scale: 1.2, y: -15 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => applyStrategy(strat.cards)}
                              onMouseEnter={() => {
                                const key = strat.id === "strat-dorma"
                                  ? "forbidden ~the sealed x~"
                                  : strat.id === "strat-star"
                                  ? "forbidden star ~world's last day~"
                                  : "zerom, origin of destruction";
                                const rep = stratRepresentations[key];
                                if (rep) {
                                  setSelectedCard(rep);
                                  setViewFaceIndex(0);
                                }
                              }}
                              className="relative w-[180px] aspect-[3/4.2] cursor-pointer shadow-[0_20px_45px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden border-2 border-white/10 hover:border-orange-500 transition-all focus:outline-none"
                            >
                              <img src={strat.img} className="absolute inset-0 w-full h-full object-cover" alt={strat.name} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 group-hover:opacity-0 transition-opacity" />
                            </motion.div>
                            <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-[0.2em] text-center leading-tight group-hover:text-orange-400 transition-colors">{strat.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 2xl:grid-cols-12 gap-4 content-start pb-8">
                      <div className="col-span-full flex justify-end">
                        <button
                          onClick={() => updateCurrentDeck(d => ({ ...d, legendary: [] }))}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-red-600 text-[10px] font-black uppercase tracking-widest text-white rounded-xl border border-white/10 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("別の戦略を選択", "Choose Different Strategy")}
                        </button>
                      </div>
                      {groupedLegendary.map(({ card, count }) => (
                        <motion.div
                          layout
                          key={card.id}
                          className="relative aspect-[3/4] flex flex-col items-center"
                        >
                          <div
                            className="w-full h-full relative group shadow-md rounded-sm cursor-pointer hover:scale-125 hover:z-[100] transition-all"
                            onClick={() => { setSelectedCard(card); setViewFaceIndex(0); addCard(card, "legendary"); }}
                            onMouseEnter={() => { setSelectedCard(card); setViewFaceIndex(0); setActiveCardKey("legendary_" + card.id); }}
                            onMouseLeave={() => setActiveCardKey(null)}
                            onContextMenu={(e) => { e.preventDefault(); removeGroupedCard(card, "legendary"); }}
                          >
                            <Card card={card} isStatic />
                            <div className={`absolute -bottom-2 inset-x-0 z-[110] flex items-center justify-between bg-slate-800 border border-slate-600 rounded-full shadow-xl overflow-hidden px-1 w-[90%] mx-auto transition-all ${activeCardKey === "legendary_" + card.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                              <button className="p-0.5 text-red-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeGroupedCard(card, "legendary"); }}><Minus className="w-2.5 h-2.5" /></button>
                              <span className="text-[8px] font-black w-3 text-center text-white">{count}</span>
                              <button className="p-0.5 text-emerald-400 hover:bg-slate-700 cursor-pointer" onClick={(e) => { e.stopPropagation(); addCard(card, "legendary"); }}><Plus className="w-2.5 h-2.5" /></button>
                            </div>
                            <motion.div key={`count-${count}`} initial={{ scale: 1.5, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="absolute -top-2 -right-2 z-[120] bg-orange-600 border-2 border-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg ring-1 ring-black/50">{count}</motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
          <section className="col-span-12 lg:col-span-5 xl:col-span-4 h-full flex flex-col overflow-hidden">
            {/* Collection */}
            <div className="flex flex-col flex-1 bg-slate-900/10 p-4 overflow-hidden backdrop-blur-sm">
              <div className="flex gap-2 mb-4">
                <div className="relative group flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder={t("カードを検索...", "Search cards...")}
                    className="w-full bg-slate-800/60 border border-white/5 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all placeholder:text-slate-600 backdrop-blur-sm text-xs"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2 rounded-xl border transition-all flex items-center justify-center shadow-lg active:scale-95",
                    showFilters ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  )}
                  title={t("フィルター", "Filters")}
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={startAddCard}
                  className="p-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-95"
                  title={t("カードを追加", "Add Card")}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex bg-slate-800/40 p-1 rounded-xl mb-4 border border-white/5 shrink-0">
                {[
                  { id: "all", label: t("すべて", "All Cards"), icon: <LayoutGrid className="w-3 h-3" /> },
                  { id: "doubleSided", label: "Double Sided", icon: <Layers className="w-3 h-3" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setSearchTab(tab.id as any); setPage(1); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      searchTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4 bg-slate-800/60 rounded-xl border border-white/10 shadow-2xl flex flex-col max-h-[70vh]"
                  >
                    <div className="overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4">
                      {/* Civilization buttons */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("文明", "Civilization")}</span>
                        <div className="flex flex-wrap gap-2">
                          {["Light", "Water", "Darkness", "Fire", "Nature", "Zero"].map(civ => {
                            const colors: any = {
                              "Light": "bg-yellow-400", "Water": "bg-blue-400", "Darkness": "bg-purple-900",
                              "Fire": "bg-red-500", "Nature": "bg-emerald-500", "Zero": "bg-slate-500"
                            };
                            const isActive = tempFilters.civ.includes(civ);
                            return (
                              <button key={civ} onClick={() => setTempFilters(f => ({ ...f, civ: isActive ? f.civ.filter(c => c !== civ) : [...f.civ, civ] }))}
                                className={cn("px-2 py-1 rounded text-[8px] font-black uppercase transition-all border flex items-center gap-1.5",
                                  isActive ? "bg-white/10 border-white/40 text-white shadow-lg" : "bg-transparent border-white/10 text-slate-500 hover:border-white/20")}>
                                <div className={cn("w-2 h-2 rounded-full", colors[civ])} />
                                {civ}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("コスト", "Cost")}</span>
                          <input type="number" min="-1" value={tempFilters.cost === -1 ? "" : tempFilters.cost}
                            onChange={(e) => setTempFilters(f => ({ ...f, cost: e.target.value === "" ? -1 : parseInt(e.target.value) }))}
                            className="bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" placeholder="Any" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("パワー", "Power")}</span>
                          <input type="number" min="-1" step="1000" value={tempFilters.power === -1 ? "" : tempFilters.power}
                            onChange={(e) => setTempFilters(f => ({ ...f, power: e.target.value === "" ? -1 : parseInt(e.target.value) }))}
                            className="bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" placeholder="Any" />
                        </div>
                      </div>

                      {/* Set Searchable Input (Datalist) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("セット", "Set")}</span>
                        <input
                          list="set-options"
                          placeholder={t("セット名を検索...", "Search for a set...")}
                          value={tempFilters.set || ""}
                          onChange={(e) => setTempFilters(f => ({ ...f, set: e.target.value }))}
                          className="bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 w-full"
                        />
                        <datalist id="set-options">
                          {availableSets.map(set => (
                            <option key={set} value={set} />
                          ))}
                        </datalist>
                      </div>

                      {/* Type Dropdown (Exhaustive) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("種別", "Type")}</span>
                        <div className="relative group/type">
                          <select multiple size={1} value={tempFilters.type}
                            onChange={(e) => setTempFilters(f => ({ ...f, type: Array.from(e.target.selectedOptions, o => o.value) }))}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer">
                            {[
                              "Castle", "Ceremony of Zeron", "Creature", "Cross Gear", "D2 Field", "DG Field", "DM Field", "Dragheart Creature", "Dragheart Fortress", "Dragheart Weapon", "Dragonic Field", "Dream Creature", "Evolution Creature", "Evolution Cross Gear", "Evolution Dragheart Creature", "Evolution Dream Creature", "Evolution Exile Creature", "Evolution Psychic Creature", "Exile Creature", "Faerie Field", "Final Forbidden Creature", "Final Forbidden Field", "Forbidden Creature", "Forbidden Impulse", "Fortress", "G-Neo Creature", "Gacharange Creature", "Giga Orega Aura", "Happiness Field", "King Cell", "King Creature", "Land", "Mono Artifact", "Moonless Night Field", "Neo Creature", "Neo Evolution Creature", "Neo Gacharange Creature", "Orega Aura", "Psychic Creature", "Psychic Field", "Psychic Super Creature", "Rule Plus", "Spell", "Star Evolution Creature", "Star Max Evolution Creature", "Tamaseed", "Tamaseed / Creature", "T2 Field", "Twinpact", "Zeron Creature", "Zeron Nebula"
                            ].sort().map(type => <option key={type} value={type} className="bg-slate-800 p-2 my-1 rounded text-white checked:bg-blue-600">{type}</option>)}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"><Plus className="w-3 h-3" /></div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {tempFilters.type.map(t => (
                              <button key={t} onClick={() => setTempFilters(f => ({ ...f, type: f.type.filter(x => x !== t) }))}
                                className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-1 hover:bg-red-500/20 hover:text-red-400">
                                {t} <Minus className="w-2 h-2" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("種族", "Race")}</span>
                          <input type="text" value={tempFilters.race || ""} onChange={(e) => setTempFilters(f => ({ ...f, race: e.target.value }))}
                            className="bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50" placeholder="Angel Command..." />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("レアリティ", "Rarity")}</span>
                          <select value={tempFilters.rarity} onChange={(e) => setTempFilters(f => ({ ...f, rarity: e.target.value }))}
                            className="w-full bg-slate-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer">
                            <option value="">Any</option>
                            {[
                              "Common", "Uncommon", "Rare", "Very Rare", "Super Rare", "Dai Sensei Rare", "DG Rare", "Double Victory", "Dream Rare", "Final Forbidden Legend Card",
                              "Forbidden Legend Card", "Hero Rare", "King Master Card", "Legend Card", "Master Card", "Master Dolszak Card", "Master Dragon Card", "Master Hazard Card",
                              "Master MAX Card", "Master Special Move Card", "Master Zetto Card", "Over Rare", "Secret Card", "Special Super Rare", "Victory Rare", "Visual Shock Secret Card", "No Rarity"
                            ].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Keywords Sections (All Wiki Categories) */}
                      <div className="flex flex-col gap-4">
                        {[
                          { label: "Evergreen", color: "emerald", items: ["Blocker", "Charger", "Double Breaker", "Triple Breaker", "Powered Breaker", "Saver", "Shield Trigger", "Slayer", "Speed Attacker", "Guardman", "Mach Fighter", "Justdiver", "Tap Ability", "Strike Back"] },
                          { label: "Keywords", color: "indigo", items: ["Abyss Rush", "Awaken", "Civil Count", "Doron Go", "Dragsolution", "EX Life", "Gachinko Judge", "God Link", "Gravity Zero", "Guard Strike", "Invasion", "Mana Arms", "Mana Drive", "Meteorburn", "Revolution", "Revolution Change", "Sasagale", "Shinkapower", "Star Evolution", "Sympathy"] },
                          { label: "Triggers", color: "orange", items: ["Attack Trigger", "Come Into Play Trigger", "Leave Trigger", "Put Into Graveyard", "Tap Trigger", "Must Attack This Creature If Able"] },
                          { label: "Removal", color: "red", items: ["Blocker Based Removal", "Bounce", "Can Attack Untapped Creatures", "Card Removal", "Choice Removal", "Cost Based Removal", "Cross Gear Removal", "Deck Feed", "Decrease Power", "Fixed Removal", "Force Attack", "Force Battle", "Force Block", "Hyperspatial Feed", "Mana Feed", "Mass Removal", "Non-Creature Based Removal", "Power Based Removal", "Puts Seals", "Self Removal", "Shield Feed", "Tamaseed Removal", "Tapped Removal", "Unique Removal", "Untapped Removal"] },
                          { label: "Evolution", color: "sky", items: ["Blocker Evolution", "Deck Evolution", "Galaxy Vortex Evolution", "Graveyard Galaxy Vortex Evolution", "Graveyard Vortex Evolution", "Graveyard Evolution", "Hand Evolution", "Mana Galaxy Vortex Evolution", "Mana Vortex Evolution", "Mana Evolution", "Neo Evolution", "Oni Star Max Evolution", "Star Evolution", "Star Max Evolution", "Super Infinite Graveyard Evolution", "Super Infinite Evolution", "Super Infinite Evolution Omega", "Super Infinite Star Evolution", "Ultimate Evolution", "Ultimate Evolution MAX", "Ultimate Star Evolution", "Vortex Evolution"] },
                          { label: "Mechanics", color: "pink", items: ["Additional Break", "Adds Race", "Anti-Mill", "Card Discard", "Card Draw", "Cost Reduction", "Creature Recovery", "Creature Tapper", "Creature Untap", "Deck Manipulation", "Deck Search", "Destruction Substitution", "For No Cost", "Gacharange Summon", "Hand Addition", "Hand Peek", "Ignore", "Increase Power", "Lockdown", "Mana Acceleration", "Mana Burn", "Mana Recovery", "Mana Untap", "Modal Ability", "No Abilities", "Prevents Leaving of the Battle Zone", "Pseudo-Freeze", "Puts Psychic", "Reanimate", "Recruit", "Self Discard", "Self Increase Power", "Self Mill", "Self Shield Burn", "Self Tapper", "Shield Addition", "Shield Break", "Shield Burn", "Shield Peek", "Shield Recovery", "Skips Turn", "Spell Recovery", "Unattackable", "Unblockable", "Unchoosable", "Wins All Battles"] }
                        ].map(section => (
                          <div key={section.label} className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{section.label}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {section.items.map(k => {
                                const isActive = tempFilters.ability.includes(k);
                                return (
                                  <button key={k} onClick={() => setTempFilters(f => ({ ...f, ability: isActive ? f.ability.filter(x => x !== k) : [...f.ability, k] }))}
                                    className={cn("px-2 py-1 rounded text-[8px] font-bold border transition-all",
                                      isActive ? `bg-${section.color}-600/30 border-${section.color}-500 text-white` : "border-white/5 hover:border-white/20 text-slate-500")}>
                                    {k}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sticky Footer for Buttons */}
                    <div className="p-3 bg-slate-900/80 border-t border-white/5 flex gap-2">
                      <button onClick={() => { setFilters({ ...tempFilters }); setShowFilters(false); }}
                        className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        {t("適用する", "Apply Filters")}
                      </button>
                      <button onClick={() => {
                        const empty = { civ: [], type: [], cost: -1, power: -1, race: "", ability: [], rarity: "", set: "" };
                        setTempFilters(empty); setFilters(empty);
                      }}
                        className="py-1.5 px-3 bg-slate-700/50 hover:bg-slate-700 text-[8px] font-black uppercase tracking-widest text-slate-300 rounded-lg border border-white/5 transition-all active:scale-95">
                        {t("リセット", "Reset")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-1 px-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase">{total} {t("結果", "Results")}</p>
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3 h-3" /></button>
                  <div className="flex items-center gap-1 bg-slate-800/40 rounded-lg px-2 py-0.5 border border-white/5 shadow-inner group-focus-within:border-blue-500/50 transition-all">
                    <input
                      type="text"
                      value={inputPage}
                      onChange={(e) => setInputPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const p = parseInt(inputPage);
                          if (!isNaN(p) && p >= 1 && p <= totalPages) setPage(p);
                          else setInputPage(page.toString());
                        }
                      }}
                      onBlur={() => {
                        const p = parseInt(inputPage);
                        if (!isNaN(p) && p >= 1 && p <= (totalPages || 1)) setPage(p);
                        else setInputPage(page.toString());
                      }}
                      className="bg-transparent border-none text-[10px] font-black text-blue-400 w-6 text-center focus:outline-none placeholder:text-slate-600"
                    />
                    <span className="text-[10px] font-black text-slate-600">/</span>
                    <span className="text-[10px] font-black text-slate-500 w-6 text-center">{totalPages || 1}</span>
                  </div>
                  <button disabled={page === totalPages || totalPages === 0} className="p-1 hover:bg-slate-800 rounded disabled:opacity-30" onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3 h-3" /></button>
                </div>
              </div>


              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar p-5 min-h-[400px]">
                <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
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
                          onClick={() => {
                            setSelectedCard(c);
                            setViewFaceIndex(0);

                            // Intelligent zone auto-detection
                            const nameLow = (c.nameEn || "").toLowerCase();
                            const descLow = (c.descriptionEn || "").toLowerCase();

                            // Extract type information (some basic heuristics)
                            const isPsychic = (c.backs?.length || 0) > 0 && !nameLow.includes("forbidden") && !nameLow.includes("zerom");
                            const isLegendary = nameLow.includes("forbidden") || nameLow.includes("zerom") || descLow.includes("ceremony of zeron");
                            const isGacharange = descLow.includes("gacharange");

                            let zone: "main" | "g" | "hyper" | "legendary" = "main";
                            if (isLegendary) zone = "legendary";
                            else if (isPsychic) zone = "hyper";
                            else if (isGacharange) zone = "g";

                            addCard(c, zone);
                          }}
                          onMouseEnter={() => { setSelectedCard(c); setViewFaceIndex(0); }}
                          className="relative group cursor-pointer transition-all hover:scale-125 hover:z-[100] z-10 aspect-[3/4]"
                        >
                          <Card card={c} isStatic />
                          <div className={`absolute inset-0 border rounded-sm pointer-events-none transition-colors ${selectedCard?.id === c.id ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-transparent group-hover:border-blue-500/50'}`} />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div></div></div></section></main></div>

      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImporting(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{t("デッキリストをインポート", "Import Deck List")}</h2>
                      <p className="text-[10px] text-slate-400 font-medium">{t("カードリストをここに貼り付けてください（例：4 Aqua Hulcus）", "Paste your deck list here (e.g., 4 Aqua Hulcus)")}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsImporting(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    className="w-full h-[300px] bg-slate-950/50 border border-white/5 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none custom-scrollbar"
                    placeholder={t("4 Aqua Hulcus\n4 Corile\n...", "4 Aqua Hulcus\n4 Corile\n...")}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    autoFocus
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] font-black text-slate-600 uppercase">
                    {importText.split('\n').filter(l => l.trim()).length} {t("行", "Lines")}
                  </div>
                </div>




                <div className="w-full h-px bg-white/5 my-2" />

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Import from URL</h3>
                    <p className="text-[9px] text-slate-600 px-1 font-medium">Supports Gachi-Matome and Deck Maker URLs</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://gachi-matome.com/..."
                      className="flex-1 bg-slate-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                    />
                    <button
                      onClick={handleImportUrl}
                      disabled={!importUrl.trim() || isSaving}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                      {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Layers className="w-3 h-3" />}
                      Fetch Url
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setIsImporting(false)}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-all border border-white/5"
                  >
                    {t("キャンセル", "Cancel")}
                  </button>
                  <button
                    onClick={handleImportList}
                    disabled={!importText.trim() || isSaving}
                    className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Layers className="w-4 h-4" />}
                    {t("インポート開始", "Start Import")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Card Edit Modal */}
      <AnimatePresence>
        {isEditingCardData && editingCardData && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingCardData(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg"><Edit2 className="w-5 h-5 text-blue-400" /></div>
                  <h2 className="text-lg font-black text-white">
                    {isAddingNewCard ? t("新規カード追加", "Add New Card") : t("カード編集", "Edit Card Details")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCardToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider border border-white/5"
                    title={t("コピー", "Copy Card Data")}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t("コピー", "Copy")}</span>
                  </button>
                  <button
                    onClick={pasteCardFromClipboard}
                    disabled={!clipboardCard}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider border border-white/5",
                      clipboardCard
                        ? "bg-slate-800 hover:bg-slate-700 text-emerald-400"
                        : "bg-slate-900 text-slate-600 cursor-not-allowed"
                    )}
                    title={t("貼り付け", "Paste Card Data")}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>{t("貼り付け", "Paste")}</span>
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button onClick={() => setIsEditingCardData(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/50 flex flex-col gap-6">
                {/* Wiki URL Auto-fill Section */}
                {isAddingNewCard && (
                  <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Smart Wiki</h3>
                      </div>
                      <span className="text-[9px] font-medium text-slate-500 italic px-2 py-0.5 bg-slate-900/50 rounded-full border border-white/5">
                        Paste URL or Raw Wiki Text
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <textarea
                        placeholder="https://duelmasters.fandom.com/wiki/... OR Paste raw Wiki text here..."
                        value={wikiUrl}
                        onChange={(e) => setWikiUrl(e.target.value)}
                        className="w-full h-24 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600 font-medium resize-none custom-scrollbar transition-all hover:bg-slate-900/80 shadow-inner"
                      />
                      <button
                        onClick={handleSmartImport}
                        disabled={isParsingWiki || !wikiUrl.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] border border-blue-400/30"
                      >
                        {isParsingWiki ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Layers className="w-4 h-4" />}
                        {t("スマートウィキ抽出", "Smart Wiki Extract")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Face Fields */}
                <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-4 shadow-lg relative">
                  <div className="absolute -top-2 left-4 flex items-center gap-2 bg-slate-900 border border-white/5 rounded-full px-2 py-0.5 shadow-lg">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-1">Main Face</h3>
                    <div className="flex gap-1 items-center border-l border-white/10 pl-2">
                      <button
                        onClick={() => copyFaceToClipboard(true)}
                        className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                        title={t("フェースをコピー", "Copy Face Details")}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => pasteFaceFromClipboard(true)}
                        disabled={!clipboardFace}
                        className="p-1 text-slate-500 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                        title={t("フェースを貼り付け", "Paste Face Details")}
                      >
                        <ClipboardPaste className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 mt-2">
                    {/* Preview */}
                    <div className="w-full md:w-1/3 shrink-0 flex flex-col gap-2">
                      <div className="aspect-[5/7] w-full bg-slate-950 rounded-lg overflow-hidden border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center relative group">
                        {editingCardData.image ? (
                          <img src={editingCardData.image} alt="Preview" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-20">
                            <Layers className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase">No Image</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">Main Face Preview</p>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("名前 (英語)", "Name (EN)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.nameEn || ""} onChange={e => setEditingCardData({ ...editingCardData, nameEn: e.target.value })} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("名前 (日本語)", "Name (JA)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.nameJa || ""} onChange={e => setEditingCardData({ ...editingCardData, nameJa: e.target.value })} />
                      </div>

                      <div className="col-span-2 md:col-span-4 space-y-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("画像URL", "Image URLs")}</label>
                          <button
                            type="button"
                            onClick={() => {
                              const rawImg = editingCardData.image || "";
                              const currentUrls = rawImg.includes('\n') ? rawImg.split('\n') : rawImg.includes(',') ? rawImg.split(',') : [rawImg];
                              setEditingCardData({ ...editingCardData, image: [...currentUrls, ""].join("\n") });
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-[10px] font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Slot
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            const rawImg = editingCardData.image || "";
                            const urls = rawImg.includes('\n') ? rawImg.split('\n') : rawImg.includes(',') ? rawImg.split(',') : [rawImg];
                            if (urls.length === 0 || (urls.length === 1 && urls[0] === "")) {
                              urls[0] = "";
                            }
                            
                            return urls.map((url: string, i: number) => (
                              <div key={i} className="flex gap-2 group relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCardData({
                                      ...editingCardData,
                                      preferredImageUrl: editingCardData.preferredImageUrl === url ? undefined : url
                                    });
                                  }}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                    editingCardData.preferredImageUrl === url
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                  }`}
                                  title={t("メイン画像に設定", "Set as Main Image")}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={editingCardData.preferredImageUrl === url ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </button>
                                <input
                                  className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
                                  placeholder="https://..."
                                  value={url}
                                  onChange={e => {
                                    const newUrls = [...urls];
                                    newUrls[i] = e.target.value;
                                    setEditingCardData({ ...editingCardData, image: newUrls.join("\n") });
                                  }}
                                />
                                {/* Hover preview */}
                                <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-slate-900 border border-white/10 rounded shadow-lg p-1 z-10">
                                  {url && <img src={url} alt="preview" className="w-32 h-32 object-contain" />}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newUrls = urls.filter((_: string, index: number) => index !== i);
                                    setEditingCardData({ ...editingCardData, image: newUrls.length ? newUrls.join("\n") : "" });
                                  }}
                                  className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("コスト", "Cost")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.manaCost || ""} onChange={e => setEditingCardData({ ...editingCardData, manaCost: e.target.value })} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("パワー", "Power")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.attack || ""} onChange={e => setEditingCardData({ ...editingCardData, attack: e.target.value })} />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("文明", "Civilization")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          placeholder="Light/Water..."
                          value={editingCardData.civilization || ""} onChange={e => setEditingCardData({ ...editingCardData, civilization: e.target.value })} />
                      </div>

                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種族 (英語)", "Race (EN)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.raceEn || ""} onChange={e => setEditingCardData({ ...editingCardData, raceEn: e.target.value })} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種族 (日本語)", "Race (JA)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.raceJa || ""} onChange={e => setEditingCardData({ ...editingCardData, raceJa: e.target.value })} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種別 (英語)", "Type (EN)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.typeEn || ""} onChange={e => setEditingCardData({ ...editingCardData, typeEn: e.target.value })} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種別 (日本語)", "Type (JA)")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.typeJa || ""} onChange={e => setEditingCardData({ ...editingCardData, typeJa: e.target.value })} />
                      </div>

                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("レアリティ", "Rarity")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.rarity || ""} onChange={e => setEditingCardData({ ...editingCardData, rarity: e.target.value })} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("イラストレーター", "Illustrator")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.illustrator || ""} onChange={e => setEditingCardData({ ...editingCardData, illustrator: e.target.value })} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("セット", "Primary Set")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          value={editingCardData.primary_set || ""} onChange={e => setEditingCardData({ ...editingCardData, primary_set: e.target.value })} />
                      </div>

                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("ハイパーパワー", "Hyper Power")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-amber-400 focus:outline-none focus:border-blue-500"
                          placeholder="39000"
                          value={editingCardData.hyperpower || ""} onChange={e => setEditingCardData({ ...editingCardData, hyperpower: e.target.value })} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("ソースURL", "Source URL")}</label>
                        <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-blue-300 focus:outline-none focus:border-blue-500"
                          value={editingCardData.source_url || ""} onChange={e => setEditingCardData({ ...editingCardData, source_url: e.target.value })} />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("アビリティ (英語)", "Abilities (EN)")}</label>
                        <textarea className="w-full h-24 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none custom-scrollbar"
                          value={editingCardData.descriptionEn || ""} onChange={e => setEditingCardData({ ...editingCardData, descriptionEn: e.target.value })} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("アビリティ (日本語)", "Abilities (JA)")}</label>
                        <textarea className="w-full h-24 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none custom-scrollbar"
                          value={editingCardData.descriptionJa || ""} onChange={e => setEditingCardData({ ...editingCardData, descriptionJa: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back Faces Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mt-2">
                    <h3 className="text-sm font-black text-white">{t("リバース・両面", "Back Faces")}</h3>
                    <button
                      onClick={() => {
                        const newBacks = [...(editingCardData.backs || [])];
                        newBacks.push({ name: "New Face", image_url: "", abilities_en: "", abilities_ja: "", cost: "", power: "" });
                        setEditingCardData({ ...editingCardData, backs: newBacks });
                      }}
                      className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Back Face
                    </button>
                  </div>

                  {(editingCardData.backs || []).map((back: any, index: number) => (
                    <div key={index} className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-4 relative shadow-lg">
                      <div className="absolute -top-3 left-4 flex items-center gap-2 bg-slate-900 border border-white/5 rounded-full px-2 py-0.5 shadow-lg">
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest px-1">Back Face {index + 1}</span>
                        <div className="flex gap-1 items-center border-l border-white/10 pl-2">
                          <button
                            onClick={() => copyFaceToClipboard(false, index)}
                            className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                            title={t("フェースをコピー", "Copy Face Details")}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => pasteFaceFromClipboard(false, index)}
                            disabled={!clipboardFace}
                            className="p-1 text-slate-500 hover:text-emerald-400 disabled:opacity-20 transition-colors"
                            title={t("フェースを貼り付け", "Paste Face Details")}
                          >
                            <ClipboardPaste className="w-3 h-3" />
                          </button>
                          <div className="w-[1px] h-3 bg-white/10 mx-1" />
                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveBack(index, 'up')}
                            className="text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            title={t("上に移動", "Move Up")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                          </button>
                          <button
                            disabled={index === (editingCardData.backs?.length || 0) - 1}
                            onClick={() => handleMoveBack(index, 'down')}
                            className="text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            title={t("下に移動", "Move Down")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </button>
                          <div className="w-[1px] h-3 bg-white/10 mx-1" />
                          <button
                            onClick={() => {
                              const newBacks = [...editingCardData.backs];
                              const backData = { ...newBacks[index] };

                              // Make current main face into this back face
                              newBacks[index] = {
                                name: editingCardData.nameEn || editingCardData.nameJa || "",
                                image_url: editingCardData.image || "",
                                cost: editingCardData.manaCost || "",
                                power: editingCardData.attack || "",
                                civilization: editingCardData.civilization || "",
                                abilities_en: editingCardData.descriptionEn || "",
                                abilities_ja: editingCardData.descriptionJa || "",
                                type_en: editingCardData.typeEn || "",
                                race_en: editingCardData.raceEn || "",
                                type_ja: editingCardData.typeJa || "",
                                race_ja: editingCardData.raceJa || ""
                              };

                              // Apply back face data to main face
                              setEditingCardData({
                                ...editingCardData,
                                nameEn: backData.name || "",
                                nameJa: backData.name || "",
                                image: backData.image_url || "",
                                manaCost: backData.cost || backData.mana || "",
                                attack: backData.power || "",
                                civilization: backData.civilization || "",
                                descriptionEn: backData.abilities_en || "",
                                descriptionJa: backData.abilities_ja || "",
                                typeEn: backData.type_en || "",
                                typeJa: backData.type_ja || "",
                                raceEn: backData.race_en || "",
                                raceJa: backData.race_ja || "",
                                backs: newBacks
                              });
                            }}
                            className="text-amber-400 hover:text-amber-300 hover:scale-110 transition-all font-bold flex items-center gap-1"
                            title={t("メインフェースに設定", "Set as Main Face")}
                          >
                            <Layers className="w-3 h-3" />
                          </button>
                          <div className="w-[1px] h-3 bg-white/10 mx-1" />
                          <button
                            onClick={() => {
                              const newBacks = [...editingCardData.backs];
                              newBacks.splice(index, 1);
                              setEditingCardData({ ...editingCardData, backs: newBacks });
                            }}
                            className="text-red-400 hover:text-red-300 hover:scale-110 transition-all font-bold"
                            title={t("削除", "Remove")}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 mt-2">
                        {/* Back Face Preview */}
                        <div className="w-full md:w-24 shrink-0 flex flex-col gap-1">
                          <div className="aspect-[5/7] w-full bg-slate-950 rounded border border-white/5 shadow-inner flex items-center justify-center overflow-hidden">
                            {back.image_url ? (
                              <img src={back.image_url} alt="Back Preview" className="w-full h-full object-contain" />
                            ) : (
                              <Layers className="w-4 h-4 opacity-10" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("名前", "Name")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              value={back.name || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], name: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種族 (英語)", "Race (EN)")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              placeholder="Dragon..."
                              value={back.race_en || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], race_en: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種族 (日本語)", "Race (JA)")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              placeholder="ドラゴン..."
                              value={back.race_ja || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], race_ja: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種別 (英語)", "Type (EN)")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              placeholder="Creature..."
                              value={back.type_en || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], type_en: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("種別 (日本語)", "Type (JA)")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              placeholder="クリーチャー..."
                              value={back.type_ja || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], type_ja: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>

                          <div className="col-span-4 space-y-1">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("画像URL", "Image URLs")}</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const rawImg = back.image_url || "";
                                  const currentUrls = rawImg.includes('\n') ? rawImg.split('\n') : rawImg.includes(',') ? rawImg.split(',') : [rawImg];
                                  const newBacks = [...editingCardData.backs];
                                  newBacks[index] = { ...newBacks[index], image_url: [...currentUrls, ""].join("\n") };
                                  setEditingCardData({ ...editingCardData, backs: newBacks });
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-[10px] font-bold transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add Slot
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(() => {
                                const rawImg = back.image_url || "";
                                const urls = rawImg.includes('\n') ? rawImg.split('\n') : rawImg.includes(',') ? rawImg.split(',') : [rawImg];
                                if (urls.length === 0 || (urls.length === 1 && urls[0] === "")) {
                                  urls[0] = "";
                                }
                                  return urls.map((url: string, i: number) => (
                                    <div key={i} className="flex gap-2 group relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newBacks = [...editingCardData.backs];
                                          newBacks[index] = { 
                                            ...newBacks[index], 
                                            preferredImageUrl: newBacks[index].preferredImageUrl === url ? undefined : url 
                                          };
                                          setEditingCardData({ ...editingCardData, backs: newBacks });
                                        }}
                                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                          back.preferredImageUrl === url 
                                            ? "bg-amber-500/20 text-amber-400" 
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                        }`}
                                        title={t("メイン画像に設定", "Set as Main Image")}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={back.preferredImageUrl === url ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                      </button>
                                      <input className="flex-1 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                                        placeholder="https://..."
                                        value={url} onChange={e => {
                                          const newUrls = [...urls];
                                          newUrls[i] = e.target.value;
                                          const newBacks = [...editingCardData.backs];
                                          newBacks[index] = { ...newBacks[index], image_url: newUrls.join("\n") };
                                          setEditingCardData({ ...editingCardData, backs: newBacks });
                                        }} />
                                      {/* Hover preview */}
                                      <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-slate-900 border border-white/10 rounded shadow-lg p-1 z-10">
                                        {url && <img src={url} alt="preview" className="w-32 h-32 object-contain" />}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newUrls = urls.filter((_: string, urlIndex: number) => urlIndex !== i);
                                          const newBacks = [...editingCardData.backs];
                                          newBacks[index] = { ...newBacks[index], image_url: newUrls.length ? newUrls.join("\n") : "" };
                                          setEditingCardData({ ...editingCardData, backs: newBacks });
                                        }}
                                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ));
                              })()}
                            </div>
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("コスト", "Cost")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              value={back.cost || back.mana || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], cost: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("パワー", "Power")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              value={back.power || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], power: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("文明", "Civilization")}</label>
                            <input className="w-full bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              value={back.civilization || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], civilization: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("アビリティ (英語)", "Abilities (EN)")}</label>
                            <textarea className="w-full h-20 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none custom-scrollbar"
                              value={back.abilities_en || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], abilities_en: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("アビリティ (日本語)", "Abilities (JA)")}</label>
                            <textarea className="w-full h-20 bg-slate-950 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none custom-scrollbar"
                              value={back.abilities_ja || ""} onChange={e => {
                                const newBacks = [...editingCardData.backs];
                                newBacks[index] = { ...newBacks[index], abilities_ja: e.target.value };
                                setEditingCardData({ ...editingCardData, backs: newBacks });
                              }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!editingCardData.backs || editingCardData.backs.length === 0) && (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Back Faces Configured</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900 border-t border-white/10 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setIsEditingCardData(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition-colors"
                >
                  {t("キャンセル", "Cancel")}
                </button>
                <button
                  onClick={saveFullEdit}
                  disabled={isSaving}
                  className={cn(
                    "px-6 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2",
                    saveStatus === 'success' ? "bg-emerald-600 text-white shadow-emerald-500/20" :
                      saveStatus === 'error' ? "bg-red-600 text-white" :
                        "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20",
                    isSaving && "opacity-70 cursor-wait"
                  )}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("保存中...", "Saving...")}
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t("完了", "Saved")}
                    </>
                  ) : (
                    t("保存", "Save Details")
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

