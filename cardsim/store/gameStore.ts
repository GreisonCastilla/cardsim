import { create } from 'zustand';

export type CardPosition = 'vertical' | 'horizontal';
export type CardFace = 'up' | 'down';
export type PlayerId = 'p1' | 'p2';
export type PhaseName = 'Start' | 'Untap' | 'Draw' | 'Mana' | 'Main' | 'Attack' | 'End';

export const PHASES: PhaseName[] = ['Start', 'Untap', 'Draw', 'Mana', 'Main', 'Attack', 'End'];

export interface CardFaceData {
    name: string;
    image_url: string;
    mana: string;
    power: string;
    cost: string;
    civilization: string;
    abilities_ja: string;
    abilities_en: string;
    type_ja: string;
    type_en: string;
    race_ja: string;
    race_en: string;
    preferredImageUrl?: string;
}

export interface GameCard {
    id: string;
    name: string;
    nameJa?: string;
    nameEn?: string;
    image?: string;
    description: string;
    descriptionJa?: string;
    descriptionEn?: string;
    manaCost: number | string;
    attack: number | string;
    civilization: string;
    raceEn?: string;
    raceJa?: string;
    typeEn?: string;
    typeJa?: string;
    mana?: string;
    rarity?: string;
    illustrator?: string;
    primary_set?: string;
    sets?: string[];
    hyperpower?: string;
    source_url?: string;
    color: string;
    position: CardPosition;
    face: CardFace;
    owner: PlayerId;
    boardX?: number | null;
    boardY?: number | null;
    backs?: CardFaceData[];
    activeFaceIndex?: number; // 0 = front, 1+ = backs
    preferredImageUrl?: string;
    underlyingCards?: string[]; // IDs of cards beneath this one
}

export interface CombatLink {
    sourceId: string;
    targetId: string; // cardId or player ID
    type: 'attack' | 'block';
}

export interface TargetingState {
    active: boolean;
    sourceId: string | null;
    type: 'attack' | 'block' | 'evolve' | 'stack' | null;
}

// Flat structure helps DndKit.
export type ZoneName =
    | 'p1_hand' | 'p2_hand'
    | 'p1_mainDeck' | 'p2_mainDeck'
    | 'p1_shields' | 'p2_shields'
    | 'p1_manaZone' | 'p2_manaZone'
    | 'p1_attackZone_front' | 'p1_attackZone_back'
    | 'p2_attackZone_front' | 'p2_attackZone_back'
    | 'p1_cemetery' | 'p2_cemetery'
    | 'p1_banishZone' | 'p2_banishZone'
    | 'p1_hyperspatial' | 'p2_hyperspatial'
    | 'p1_gZone' | 'p2_gZone'
    | 'p1_legendary' | 'p2_legendary'
    | 'p1_drawerZone' | 'p2_drawerZone'
    | 'p1_extraZone' | 'p2_extraZone';

interface GameState {
    cards: Record<string, GameCard>;
    zones: Record<ZoneName, string[]>;
    currentPlayer: PlayerId;
    currentPhase: PhaseName;
    myRole: PlayerId; // Added for multiplayer

    selectedCardIds: string[];
    toggleSelection: (cardId: string, force?: boolean) => void;
    clearSelection: () => void;
    setSelection: (cardIds: string[]) => void;

    // Targeting System
    targetingMode: TargetingState;
    combatLinks: CombatLink[];
    startTargeting: (sourceId: string, type: 'attack' | 'block' | 'evolve' | 'stack') => void;
    cancelTargeting: () => void;
    confirmTarget: (targetId: string) => void;
    clearCombatLinks: () => void;

    floatingShields: string[];
    setFloatingShields: (ids: string[] | ((prev: string[]) => string[])) => void;
    revealedShieldIds: string[];
    setRevealedShieldIds: (ids: string[] | ((prev: string[]) => string[])) => void;
    peekingShieldIds: string[];
    setPeekingShieldIds: (ids: string[] | ((prev: string[]) => string[])) => void;

    activeTriggerEffect: { type: string, name: string, id: string, targetZone?: string } | null;
    setActiveTriggerEffect: (effect: { type: string, name: string, id: string, targetZone?: string } | null) => void;

    revolutionChangeEffect: { handCardId: string, boardCardId: string } | null;
    setRevolutionChangeEffect: (effect: { handCardId: string, boardCardId: string } | null) => void;
    invasionEffect: { cardId: string } | null;
    setInvasionEffect: (effect: { cardId: string } | null) => void;
    execRevolutionChange: (handCardId: string, boardCardId: string) => void;

    summonedThisTurn: Set<string>;
    markSummonedThisTurn: (cardId: string) => void;
    clearSummonedThisTurn: () => void;

    activatingEffect: { cardId: string, ts: number } | null;
    pingCardEffect: (cardId: string) => void;

    drawCards: (playerId: PlayerId, amount: number) => void;
    shuffleDeck: (playerId: PlayerId, newOrder?: string[]) => void;
    moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName, newIndex?: number, boardX?: number | null, boardY?: number | null) => void;
    topToMana: (playerId: PlayerId) => void;
    topToShield: (playerId: PlayerId) => void;
    topToGraveyard: (playerId: PlayerId, amount: number) => void;
    toggleTapped: (cardId: string) => void;
    toggleTappedBatch: (cardIds: string[]) => void;
    toggleFace: (cardId: string) => void;
    toggleFaceBatch: (cardIds: string[]) => void;
    cycleFace: (cardId: string) => void;
    cycleFaceBatch: (cardIds: string[]) => void;
    untapAll: (playerId: PlayerId) => void;
    nextPhase: () => void;
    endTurn: (playerId: PlayerId) => void;
    initializeGame: (p1Deck?: any[], p2Deck?: any[]) => void;
    moveCardsBatch: (cardIds: string[], toZone: ZoneName) => void;
    evolveCard: (sourceId: string, targetId: string, under?: boolean, face?: 'up' | 'down') => void;

    inspectedStackCardId: string | null;
    setInspectedStackCardId: (cardId: string | null) => void;

    draggingCardId: string | null;
    setDraggingCardId: (cardId: string | null) => void;

    // Multiplayer actions
    applyRemoteZones: (zones: Partial<Record<ZoneName, string[]>>, cardFaces?: Record<string, CardFace>) => void;
    applyFullSync: (zones: Record<ZoneName, string[]>, cards: Record<string, GameCard>, currentPlayer?: PlayerId, currentPhase?: PhaseName) => void;
    applyRemotePhase: (phase: PhaseName, player: PlayerId) => void;
    initializeGameFromDecks: (myDeckCards: GameCard[], opponentDeckCards: GameCard[], role: PlayerId) => void;
}

const generateDeck = (count: number, prefix: string, owner: PlayerId): GameCard[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `${owner}_${prefix}_${i}`,
        name: `Carta Blanca ${prefix} ${i + 1}`,
        description: `Esta es una carta de prueba generada para ${owner.toUpperCase()}.`,
        manaCost: Math.floor(Math.random() * 8) + 1,
        attack: (Math.floor(Math.random() * 10) + 1) * 1000,
        civilization: 'Neutral',
        color: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'][Math.floor(Math.random() * 5)],
        position: 'vertical',
        face: 'down',
        owner
    }));
};

const createInitialZones = (): Record<ZoneName, string[]> => ({
    p1_hand: [], p2_hand: [],
    p1_mainDeck: [], p2_mainDeck: [],
    p1_shields: [], p2_shields: [],
    p1_manaZone: [], p2_manaZone: [],
    p1_attackZone_front: [], p1_attackZone_back: [],
    p2_attackZone_front: [], p2_attackZone_back: [],
    p1_cemetery: [], p2_cemetery: [],
    p1_banishZone: [], p2_banishZone: [],
    p1_hyperspatial: [], p2_hyperspatial: [],
    p1_gZone: [], p2_gZone: [],
    p1_legendary: [], p2_legendary: [],
    p1_drawerZone: [], p2_drawerZone: [],
    p1_extraZone: [], p2_extraZone: [],
});

export const useGameStore = create<GameState>((set) => ({
    cards: {},
    zones: createInitialZones(),
    currentPlayer: 'p1',
    currentPhase: 'Start',
    myRole: 'p1',
    selectedCardIds: [],
    targetingMode: { active: false, sourceId: null, type: null },
    combatLinks: [],

    floatingShields: [],
    setFloatingShields: (updater) => set((state) => ({ floatingShields: typeof updater === 'function' ? updater(state.floatingShields) : updater })),
    revealedShieldIds: [],
    setRevealedShieldIds: (updater) => set((state) => ({ revealedShieldIds: typeof updater === 'function' ? updater(state.revealedShieldIds) : updater })),
    peekingShieldIds: [],
    setPeekingShieldIds: (updater) => set((state) => ({ peekingShieldIds: typeof updater === 'function' ? updater(state.peekingShieldIds) : updater })),

    activeTriggerEffect: null,
    setActiveTriggerEffect: (effect) => set({ activeTriggerEffect: effect }),

    revolutionChangeEffect: null,
    setRevolutionChangeEffect: (effect) => set({ revolutionChangeEffect: effect }),

    invasionEffect: null,
    setInvasionEffect: (effect) => set({ invasionEffect: effect }),

    inspectedStackCardId: null,
    setInspectedStackCardId: (cardId) => set({ inspectedStackCardId: cardId }),

    draggingCardId: null,
    setDraggingCardId: (cardId) => set({ draggingCardId: cardId }),

    // ─── Summoning Sickness Tracking ───────────────────────────────────────
    summonedThisTurn: new Set<string>(),
    markSummonedThisTurn: (cardId) => set((state) => {
        const next = new Set(state.summonedThisTurn);
        next.add(cardId);
        return { summonedThisTurn: next };
    }),
    clearSummonedThisTurn: () => set({ summonedThisTurn: new Set<string>() }),

    activatingEffect: null,
    pingCardEffect: (cardId) => {
        const ts = Date.now();
        set({ activatingEffect: { cardId, ts } });
        setTimeout(() => set((state) => state.activatingEffect?.ts === ts ? { activatingEffect: null } : state), 1500);
    },

    execRevolutionChange: (handCardId, boardCardId) => set((state) => {
        const handCard = state.cards[handCardId];
        const boardCard = state.cards[boardCardId];
        if (!handCard || !boardCard) return state;

        let originZone: ZoneName | null = null;
        for (const [zoneName, cardIds] of Object.entries(state.zones)) {
            if (cardIds.includes(handCardId)) {
                originZone = zoneName as ZoneName;
                break;
            }
        }
        if (!originZone) return state;

        let boardZone: ZoneName | null = null;
        for (const [zoneName, cardIds] of Object.entries(state.zones)) {
            if (cardIds.includes(boardCardId) && (zoneName.includes('attackZone') || zoneName.includes('manaZone'))) {
                boardZone = zoneName as ZoneName;
                break;
            }
        }
        if (!boardZone) return state;

        const newZones = { ...state.zones };
        const newCards = { ...state.cards };

        const underlyingIds = boardCard.underlyingCards || [];
        newZones[boardZone] = newZones[boardZone].filter(id => id !== boardCardId);

        const handZone = `${boardCard.owner}_hand` as ZoneName;
        newZones[handZone] = [...newZones[handZone], boardCardId, ...underlyingIds];

        newZones[originZone] = newZones[originZone].filter(id => id !== handCardId);
        newZones[boardZone] = [...newZones[boardZone], handCardId];

        const newCombatLinks = state.combatLinks.map(link => {
            let updated = { ...link };
            if (link.sourceId === boardCardId) updated.sourceId = handCardId;
            if (link.targetId === boardCardId) updated.targetId = handCardId;
            return updated;
        });

        let newTargetingMode = state.targetingMode;
        if (state.targetingMode.sourceId === boardCardId) {
            newTargetingMode = { ...state.targetingMode, sourceId: handCardId };
        }

        let newSelectedCardIds = state.selectedCardIds.filter(id => id !== boardCardId && id !== handCardId);
        if (state.selectedCardIds.includes(boardCardId)) {
            newSelectedCardIds.push(handCardId);
        }

        newCards[boardCardId] = {
            ...boardCard,
            position: 'vertical',
            face: 'up',
            underlyingCards: []
        };
        underlyingIds.forEach(uid => {
            if (newCards[uid]) {
                newCards[uid] = { ...newCards[uid], position: 'vertical', face: 'up', underlyingCards: [] };
            }
        });

        newCards[handCardId] = {
            ...handCard,
            position: boardCard.position,
            boardX: boardCard.boardX,
            boardY: boardCard.boardY,
            face: 'up'
        };

        return {
            zones: newZones,
            cards: newCards,
            combatLinks: newCombatLinks,
            targetingMode: newTargetingMode,
            selectedCardIds: newSelectedCardIds,
            revolutionChangeEffect: { handCardId, boardCardId }
        };
    }),

    startTargeting: (sourceId, type) => set({ targetingMode: { active: true, sourceId, type } }),
    cancelTargeting: () => set({ targetingMode: { active: false, sourceId: null, type: null } }),
    confirmTarget: (targetId) => set((state) => {
        if (!state.targetingMode.active || !state.targetingMode.sourceId || !state.targetingMode.type) return state;

        const sourceId = state.targetingMode.sourceId;
        const type = state.targetingMode.type;

        if (sourceId === targetId) return state;

        if (type === 'evolve') {
            const targetCard = state.cards[targetId];
            const sourceCard = state.cards[sourceId];
            if (!targetCard || !sourceCard) return state;

            let targetZone: ZoneName | null = null;
            for (const [z, ids] of Object.entries(state.zones)) {
                if (ids.includes(targetId)) {
                    targetZone = z as ZoneName;
                    break;
                }
            }
            if (!targetZone) return state;

            let sourceZone: ZoneName | null = null;
            for (const [z, ids] of Object.entries(state.zones)) {
                if (ids.includes(sourceId)) {
                    sourceZone = z as ZoneName;
                    break;
                }
            }
            if (!sourceZone) return state;

            const newZones = { ...state.zones };
            const newCards = { ...state.cards };

            newZones[sourceZone] = newZones[sourceZone].filter(id => id !== sourceId);
            newZones[targetZone] = newZones[targetZone].map(id => id === targetId ? sourceId : id);

            const newUnderlying = [
                ...(targetCard.underlyingCards || []),
                targetId,
                ...(sourceCard.underlyingCards || [])
            ];
            newCards[sourceId] = {
                ...sourceCard,
                underlyingCards: newUnderlying,
                boardX: targetCard.boardX,
                boardY: targetCard.boardY,
                position: targetCard.position,
                face: 'up'
            };
            newCards[targetId] = { ...targetCard, underlyingCards: [] };

            return {
                cards: newCards,
                zones: newZones,
                targetingMode: { active: false, sourceId: null, type: null }
            };
        }

        if (type === 'stack') {
            const targetCard = state.cards[targetId];
            const sourceCard = state.cards[sourceId];
            if (!targetCard || !sourceCard) return state;

            let sourceZone: ZoneName | null = null;
            for (const [z, ids] of Object.entries(state.zones)) {
                if (ids.includes(sourceId)) {
                    sourceZone = z as ZoneName;
                    break;
                }
            }
            if (!sourceZone) return state;

            const newZones = { ...state.zones };
            const newCards = { ...state.cards };

            newZones[sourceZone] = newZones[sourceZone].filter(id => id !== sourceId);

            const newUnderlying = [
                ...(sourceCard.underlyingCards || []),
                sourceId,
                ...(targetCard.underlyingCards || [])
            ];
            newCards[targetId] = {
                ...targetCard,
                underlyingCards: newUnderlying
            };

            newCards[sourceId] = {
                ...sourceCard,
                face: 'up',
                underlyingCards: []
            };

            return {
                cards: newCards,
                zones: newZones,
                targetingMode: { active: false, sourceId: null, type: null }
            };
        }

        const newLink: CombatLink = {
            sourceId,
            targetId,
            type
        };

        return {
            combatLinks: [...state.combatLinks, newLink],
            targetingMode: { active: false, sourceId: null, type: null }
        };
    }),
    clearCombatLinks: () => set({ combatLinks: [] }),

    toggleSelection: (cardId, force) => set((state) => {
        const isSelected = state.selectedCardIds.includes(cardId);
        const shouldSelect = force !== undefined ? force : !isSelected;

        if (shouldSelect && !isSelected) {
            return { selectedCardIds: [...state.selectedCardIds, cardId] };
        } else if (!shouldSelect && isSelected) {
            return { selectedCardIds: state.selectedCardIds.filter(id => id !== cardId) };
        }
        return state;
    }),

    clearSelection: () => set({ selectedCardIds: [] }),
    setSelection: (cardIds) => set({ selectedCardIds: cardIds }),

    drawCards: (playerId, amount) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const handKey = `${playerId}_hand` as ZoneName;

        const newDeck = [...state.zones[deckKey]];
        const drawn = newDeck.splice(0, amount);

        const newCards: Record<string, GameCard> = { ...state.cards };
        drawn.forEach(id => {
            newCards[id] = { ...newCards[id], face: 'up' as CardFace, position: 'vertical' as CardPosition };
        });

        return {
            cards: newCards,
            zones: {
                ...state.zones,
                [deckKey]: newDeck,
                [handKey]: [...state.zones[handKey], ...drawn],
            }
        };
    }),

    shuffleDeck: (playerId, newOrder) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const shuffled = newOrder || [...state.zones[deckKey]].sort(() => Math.random() - 0.5);
        return {
            zones: {
                ...state.zones,
                [deckKey]: shuffled,
            }
        };
    }),

    moveCard: (cardId, fromZone, toZone, newIndex, boardX, boardY) => set((state) => {
        const card = state.cards[cardId];
        if (!card) return state;

        const isFromBattle = fromZone.includes('attackZone');
        const isToBattle = toZone.includes('attackZone');

        const nextSummonedThisTurn = new Set(state.summonedThisTurn);
        if (isToBattle && !isFromBattle) {
            nextSummonedThisTurn.add(cardId);
        }
        if (isFromBattle && !isToBattle) {
            nextSummonedThisTurn.delete(cardId);
        }

        const newCards = { ...state.cards };
        const idsToMove = [cardId];

        const isFromShields = fromZone.includes('shields');
        const isToShields = toZone.includes('shields');
        if ((isFromBattle && !isToBattle) || (isFromShields && !isToShields)) {
            if (card.underlyingCards && card.underlyingCards.length > 0) {
                idsToMove.push(...card.underlyingCards);
                newCards[cardId] = { ...card, underlyingCards: [] };
            }
        }

        const isSameZone = fromZone === toZone;
        if (!state.zones[fromZone] || (!isSameZone && !state.zones[toZone])) return state;

        const fromArray = [...state.zones[fromZone]];

        const index = fromArray.indexOf(cardId);
        if (index === -1) {
            let parentId: string | null = null;
            for (const id of fromArray) {
                if (newCards[id].underlyingCards?.includes(cardId)) {
                    parentId = id;
                    break;
                }
            }
            if (parentId) {
                newCards[parentId] = {
                    ...newCards[parentId],
                    underlyingCards: newCards[parentId].underlyingCards?.filter(id => id !== cardId)
                };
            } else {
                return state;
            }
        } else {
            fromArray.splice(index, 1);
        }

        const toArray = isSameZone ? fromArray : [...state.zones[toZone]];

        if (typeof newIndex === 'number') {
            toArray.splice(newIndex, 0, ...idsToMove);
        } else {
            toArray.push(...idsToMove);
        }

        idsToMove.forEach(id => {
            const c = newCards[id];
            newCards[id] = {
                ...c,
                boardX: boardX !== undefined ? boardX : c.boardX,
                boardY: boardY !== undefined ? boardY : c.boardY,
                face: (toZone.includes('mainDeck') || toZone.includes('shields')) ? 'down' : 'up',
                position: isToBattle ? c.position : 'vertical',
                underlyingCards: []
            };

            if (boardX === null) delete newCards[id].boardX;
            if (boardY === null) delete newCards[id].boardY;
        });

        return {
            zones: {
                ...state.zones,
                [fromZone]: fromArray,
                [toZone]: toArray
            },
            cards: newCards,
            summonedThisTurn: nextSummonedThisTurn
        };
    }),

    topToMana: (playerId) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const manaKey = `${playerId}_manaZone` as ZoneName;
        if (state.zones[deckKey].length === 0) return state;

        const drawnId = state.zones[deckKey][0];
        const newDeck = state.zones[deckKey].slice(1);
        const newMana = [...state.zones[manaKey], drawnId];

        return {
            zones: { ...state.zones, [deckKey]: newDeck, [manaKey]: newMana },
            cards: { ...state.cards, [drawnId]: { ...state.cards[drawnId], face: 'up', position: 'horizontal' } }
        };
    }),

    topToShield: (playerId) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const shieldKey = `${playerId}_shields` as ZoneName;
        if (state.zones[deckKey].length === 0) return state;

        const drawnId = state.zones[deckKey][0];
        const newDeck = state.zones[deckKey].slice(1);
        const newShield = [...state.zones[shieldKey], drawnId];

        return {
            zones: { ...state.zones, [deckKey]: newDeck, [shieldKey]: newShield },
            cards: { ...state.cards, [drawnId]: { ...state.cards[drawnId], face: 'down', position: 'vertical' } }
        };
    }),

    topToGraveyard: (playerId, amount) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const graveKey = `${playerId}_cemetery` as ZoneName;
        const actualAmount = Math.min(amount, state.zones[deckKey].length);
        if (actualAmount <= 0) return state;

        const drawnIds = state.zones[deckKey].slice(0, actualAmount);
        const newDeck = state.zones[deckKey].slice(actualAmount);
        const newGrave = [...state.zones[graveKey], ...drawnIds];

        const newCards = { ...state.cards };
        drawnIds.forEach(id => {
            newCards[id] = { ...newCards[id], face: 'up', position: 'vertical' };
        });

        return {
            zones: { ...state.zones, [deckKey]: newDeck, [graveKey]: newGrave },
            cards: newCards
        };
    }),

    toggleTapped: (cardId) => set((state) => ({
        cards: {
            ...state.cards,
            [cardId]: {
                ...state.cards[cardId],
                position: state.cards[cardId].position === 'vertical' ? 'horizontal' : 'vertical'
            }
        }
    })),

    toggleTappedBatch: (cardIds) => set((state) => {
        const newCards = { ...state.cards };
        cardIds.forEach(id => {
            if (newCards[id]) {
                newCards[id] = {
                    ...newCards[id],
                    position: newCards[id].position === 'vertical' ? 'horizontal' : 'vertical'
                };
            }
        });
        return { cards: newCards };
    }),

    toggleFace: (cardId) => set((state) => ({
        cards: {
            ...state.cards,
            [cardId]: {
                ...state.cards[cardId],
                face: state.cards[cardId].face === 'up' ? 'down' : 'up'
            }
        }
    })),

    toggleFaceBatch: (cardIds) => set((state) => {
        const newCards = { ...state.cards };
        cardIds.forEach(id => {
            if (newCards[id]) {
                newCards[id] = {
                    ...newCards[id],
                    face: newCards[id].face === 'up' ? 'down' : 'up'
                };
            }
        });
        return { cards: newCards };
    }),

    cycleFace: (cardId) => set((state) => {
        const card = state.cards[cardId];
        if (card && card.backs && card.backs.length > 0) {
            const nextIndex = ((card.activeFaceIndex || 0) + 1) % (card.backs.length + 1);
            return {
                cards: {
                    ...state.cards,
                    [cardId]: { ...card, activeFaceIndex: nextIndex }
                }
            };
        }
        return state;
    }),

    cycleFaceBatch: (cardIds) => set((state) => {
        const newCards = { ...state.cards };
        cardIds.forEach(id => {
            const card = newCards[id];
            if (card && card.backs && card.backs.length > 0) {
                const nextIndex = ((card.activeFaceIndex || 0) + 1) % (card.backs.length + 1);
                newCards[id] = { ...card, activeFaceIndex: nextIndex };
            }
        });
        return { cards: newCards };
    }),

    untapAll: (playerId) => set((state) => {
        const attackFrontKey = `${playerId}_attackZone_front` as ZoneName;
        const attackBackKey = `${playerId}_attackZone_back` as ZoneName;
        const manaKey = `${playerId}_manaZone` as ZoneName;
        const newCards = { ...state.cards };

        state.zones[attackFrontKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' };
        });
        state.zones[attackBackKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' };
        });
        state.zones[manaKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' };
        });

        return { cards: newCards };
    }),

    nextPhase: () => set((state) => {
        const currentIndex = PHASES.indexOf(state.currentPhase);
        let nextIndex = currentIndex + 1;
        let nextPlayer = state.currentPlayer;

        if (nextIndex >= PHASES.length) {
            nextIndex = 0;
            nextPlayer = nextPlayer === 'p1' ? 'p2' : 'p1';
        }

        const nextPhaseName = PHASES[nextIndex];
        let newCards = { ...state.cards };
        let newZones = { ...state.zones };
        let newCombatLinks = state.combatLinks;
        let newSummonedThisTurn = state.summonedThisTurn;

        if (state.currentPhase === 'Attack' || nextPlayer !== state.currentPlayer) {
            newCombatLinks = [];
        }

        if (nextPhaseName === 'Untap') {
            const attackFrontKey = `${nextPlayer}_attackZone_front` as ZoneName;
            const attackBackKey = `${nextPlayer}_attackZone_back` as ZoneName;
            const manaKey = `${nextPlayer}_manaZone` as ZoneName;
            state.zones[attackFrontKey].forEach(id => {
                newCards[id] = { ...newCards[id], position: 'vertical' };
            });
            state.zones[attackBackKey].forEach(id => {
                newCards[id] = { ...newCards[id], position: 'vertical' };
            });
            state.zones[manaKey].forEach(id => {
                newCards[id] = { ...newCards[id], position: 'vertical' };
            });
            newSummonedThisTurn = new Set<string>();
        } else if (nextPhaseName === 'Draw') {
            const deckKey = `${nextPlayer}_mainDeck` as ZoneName;
            const handKey = `${nextPlayer}_hand` as ZoneName;
            if (state.zones[deckKey].length > 0) {
                const drawnId = state.zones[deckKey][0];
                const newDeck = state.zones[deckKey].slice(1);
                const newHand = [...state.zones[handKey], drawnId];

                newCards[drawnId] = { ...newCards[drawnId], face: 'up', position: 'vertical' };

                newZones = {
                    ...newZones,
                    [deckKey]: newDeck,
                    [handKey]: newHand
                };
            }
        }

        return {
            currentPhase: nextPhaseName,
            currentPlayer: nextPlayer,
            cards: newCards,
            zones: newZones,
            combatLinks: newCombatLinks,
            summonedThisTurn: newSummonedThisTurn
        };
    }),

    moveCardsBatch: (cardIds, toZone) => set((state) => {
        const newZones = { ...state.zones };
        const newCards = { ...state.cards };

        const allIdsToMove: string[] = [];
        const isToBattle = toZone.includes('attackZone');

        cardIds.forEach(cardId => {
            const card = state.cards[cardId];
            if (!card) return;

            let fromZone: ZoneName | null = null;
            for (const [z, ids] of Object.entries(state.zones)) {
                if (ids.includes(cardId)) {
                    fromZone = z as ZoneName;
                    break;
                }
            }

            if (!fromZone || fromZone === toZone) return;

            const isFromBattle = fromZone.includes('attackZone');
            const isFromShields = fromZone.includes('shields');
            const isToShields = toZone.includes('shields');
            const subBatch = [cardId];

            if ((isFromBattle && !isToBattle) || (isFromShields && !isToShields)) {
                if (card.underlyingCards && card.underlyingCards.length > 0) {
                    subBatch.push(...card.underlyingCards);
                    newCards[cardId] = { ...card, underlyingCards: [] };
                }
            }

            newZones[fromZone] = newZones[fromZone].filter(id => id !== cardId);
            allIdsToMove.push(...subBatch);
        });

        newZones[toZone] = [...newZones[toZone], ...allIdsToMove];

        allIdsToMove.forEach(id => {
            const c = newCards[id];
            newCards[id] = {
                ...c,
                face: (toZone.includes('mainDeck') || toZone.includes('shields')) ? 'down' : 'up',
                position: isToBattle ? c.position : 'vertical',
                underlyingCards: []
            };
            delete newCards[id].boardX;
            delete newCards[id].boardY;
        });

        return { zones: newZones, cards: newCards };
    }),

    evolveCard: (sourceId, targetId, under, face) => set((state) => {
        const targetCard = state.cards[targetId];
        const sourceCard = state.cards[sourceId];
        if (!targetCard || !sourceCard) return state;

        let targetZone: ZoneName | null = null;
        for (const [z, ids] of Object.entries(state.zones)) {
            if (ids.includes(targetId)) {
                targetZone = z as ZoneName;
                break;
            }
        }
        if (!targetZone) return state;

        let sourceZone: ZoneName | null = null;
        for (const [z, ids] of Object.entries(state.zones)) {
            if (ids.includes(sourceId)) {
                sourceZone = z as ZoneName;
                break;
            }
        }
        if (!sourceZone) return state;

        const newZones = { ...state.zones };
        const newCards = { ...state.cards };
        let newCombatLinks = [...state.combatLinks];
        let newTargetingMode = { ...state.targetingMode };
        let newSelectedCardIds = [...state.selectedCardIds];

        newZones[sourceZone] = newZones[sourceZone].filter(id => id !== sourceId);

        if (!under) {
            newZones[targetZone] = newZones[targetZone].map(id => id === targetId ? sourceId : id);

            const newUnderlying = [
                ...(targetCard.underlyingCards || []),
                targetId,
                ...(sourceCard.underlyingCards || [])
            ];
            newCards[sourceId] = {
                ...sourceCard,
                underlyingCards: newUnderlying,
                boardX: targetCard.boardX,
                boardY: targetCard.boardY,
                position: targetCard.position,
                face: face || 'up'
            };
            newCards[targetId] = { ...targetCard, underlyingCards: [] };

            newCombatLinks = state.combatLinks.map(link => {
                let updated = { ...link };
                if (link.sourceId === targetId) updated.sourceId = sourceId;
                if (link.targetId === targetId) updated.targetId = sourceId;
                return updated;
            });

            if (state.targetingMode.sourceId === targetId) {
                newTargetingMode = { ...state.targetingMode, sourceId };
            }

            newSelectedCardIds = state.selectedCardIds.filter(id => id !== targetId && id !== sourceId);
            if (state.selectedCardIds.includes(targetId)) {
                newSelectedCardIds.push(sourceId);
            }
        } else {
            const newUnderlying = [
                ...(sourceCard.underlyingCards || []),
                sourceId,
                ...(targetCard.underlyingCards || [])
            ];
            newCards[targetId] = {
                ...targetCard,
                underlyingCards: newUnderlying
            };

            newCards[sourceId] = {
                ...sourceCard,
                face: 'up',
                underlyingCards: []
            };
        }

        return {
            cards: newCards,
            zones: newZones,
            combatLinks: newCombatLinks,
            targetingMode: newTargetingMode,
            selectedCardIds: newSelectedCardIds
        };
    }),

    endTurn: (playerId) => set((state) => {
        const attackFrontKey = `${playerId}_attackZone_front` as ZoneName;
        const attackBackKey = `${playerId}_attackZone_back` as ZoneName;
        const manaKey = `${playerId}_manaZone` as ZoneName;

        const newCards: Record<string, GameCard> = { ...state.cards };

        state.zones[attackFrontKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' as CardPosition };
        });
        state.zones[attackBackKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' as CardPosition };
        });

        state.zones[manaKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' as CardPosition };
        });

        return { cards: newCards };
    }),

    // Multiplayer actions implementation
    applyRemoteZones: (remoteZones, cardFaces) => set((state) => {
        const newZones = { ...state.zones, ...remoteZones };
        const newCards = { ...state.cards };

        (Object.entries(remoteZones) as [ZoneName, string[]][]).forEach(([zone, ids]) => {
            ids.forEach(id => {
                if (!newCards[id]) return;
                const zoneLower = zone.toLowerCase();
                const face: CardFace = (zoneLower.includes('hand') || zoneLower.includes('manazone') || zoneLower.includes('attackzone') || zoneLower.includes('hyperspatial'))
                    ? 'up' : 'down';
                newCards[id] = { ...newCards[id], face };
            });
        });

        if (cardFaces) {
            Object.entries(cardFaces).forEach(([id, face]) => {
                if (newCards[id]) newCards[id] = { ...newCards[id], face: face as CardFace };
            });
        }

        return { zones: newZones, cards: newCards };
    }),

    applyFullSync: (zones, cards, currentPlayer, currentPhase) => set((state) => ({
        zones,
        cards,
        currentPlayer: currentPlayer || state.currentPlayer,
        currentPhase: currentPhase || state.currentPhase
    })),

    applyRemotePhase: (phase, player) => set(() => ({
        currentPhase: phase,
        currentPlayer: player
    })),

    initializeGameFromDecks: (myDeckCards, opponentDeckCards, role) => set(() => {
        const preparePlayer = (owner: PlayerId, deckCards: GameCard[]) => {
            const convertToGameCard = (card: any, idx: number, prefix: string): GameCard => {
                return {
                    id: `${owner}_${prefix}_${idx}_${card.name_ja || card.name}`,
                    name: card.name_ja || card.name,
                    nameJa: card.name_ja,
                    nameEn: card.name_en,
                    image: card.image_url || card.image,
                    description: card.abilities_ja || card.description || "",
                    descriptionJa: card.abilities_ja,
                    descriptionEn: card.abilities_en,
                    manaCost: card.cost || card.manaCost || 0,
                    attack: card.power || card.attack || 0,
                    civilization: card.civilization || "Neutral",
                    raceEn: card.raceEn || card.race_en || card.race || card.subtype,
                    raceJa: card.raceJa || card.race_ja,
                    typeEn: card.typeEn || card.type_en || card.type || card.card_type,
                    typeJa: card.typeJa || card.type_ja,
                    mana: card.mana,
                    rarity: card.rarity,
                    illustrator: card.illustrator,
                    primary_set: card.primary_set,
                    sets: card.sets,
                    hyperpower: card.hyper_power || card.hyperpower,
                    source_url: card.source_url,
                    color: '#3b82f6',
                    position: 'vertical',
                    face: 'down',
                    owner,
                    backs: card.backs?.map((b: any) => ({
                        name: b.name,
                        image_url: b.image_url,
                        mana: b.mana,
                        power: b.power,
                        cost: b.cost,
                        civilization: b.civilization,
                        abilities_ja: b.abilities_ja,
                        abilities_en: b.abilities_en,
                        type_ja: b.type_ja || b.typeJa,
                        type_en: b.type_en || b.typeEn,
                        race_ja: b.race_ja || b.raceJa,
                        race_en: b.race_en || b.raceEn
                    }))
                };
            };

            let main: GameCard[] = [];
            let hyper: GameCard[] = [];
            let gzoneDeck: GameCard[] = [];

            deckCards.forEach((c, i) => {
                const gc = convertToGameCard(c, i, 'custom');
                const type = (gc.typeJa || gc.typeEn || "").toLowerCase();

                if (type.includes("psychic") || type.includes("dragheart")) {
                    hyper.push(gc);
                } else if (type.includes("gr creature")) {
                    gzoneDeck.push(gc);
                } else {
                    main.push(gc);
                }
            });

            gzoneDeck.forEach(c => { c.face = 'down'; });
            hyper.forEach(c => { c.face = 'up'; });

            const shuffledMainIds = main.map(c => c.id).sort(() => Math.random() - 0.5);
            const drawnShields = shuffledMainIds.splice(0, 5);
            const initialHand = shuffledMainIds.splice(0, 5);

            const cardMap: Record<string, GameCard> = {};
            const allPcards = [...main, ...hyper, ...gzoneDeck];
            allPcards.forEach(c => { cardMap[c.id] = c; });

            drawnShields.forEach(id => { if (cardMap[id]) cardMap[id] = { ...cardMap[id], face: 'down' }; });
            initialHand.forEach(id => { if (cardMap[id]) cardMap[id] = { ...cardMap[id], face: 'up' }; });

            return {
                cardMap,
                zonesPart: {
                    [`${owner}_hand`]: initialHand,
                    [`${owner}_mainDeck`]: shuffledMainIds,
                    [`${owner}_shields`]: drawnShields,
                    [`${owner}_manaZone`]: [],
                    [`${owner}_attackZone_front`]: [],
                    [`${owner}_attackZone_back`]: [],
                    [`${owner}_cemetery`]: [],
                    [`${owner}_banishZone`]: [],
                    [`${owner}_hyperspatial`]: hyper.map(c => c.id),
                    [`${owner}_gZone`]: gzoneDeck.map(c => c.id),
                    [`${owner}_legendary`]: [],
                    [`${owner}_drawerZone`]: [],
                    [`${owner}_extraZone`]: [],
                },
            };
        };

        const myOwner: PlayerId = role;
        const oppOwner: PlayerId = role === 'p1' ? 'p2' : 'p1';

        const myData = preparePlayer(myOwner, myDeckCards);
        const oppData = preparePlayer(oppOwner, opponentDeckCards);

        const allCards = { ...myData.cardMap, ...oppData.cardMap };

        const zones: Record<ZoneName, string[]> = {
            ...myData.zonesPart,
            ...oppData.zonesPart,
        } as Record<ZoneName, string[]>;

        return {
            cards: allCards,
            zones,
            currentPlayer: 'p1',
            currentPhase: 'Start',
            myRole: role,
            selectedCardIds: [],
            targetingMode: { active: false, sourceId: null, type: null },
            combatLinks: [],
            floatingShields: [],
            revealedShieldIds: [],
            peekingShieldIds: [],
            activeTriggerEffect: null,
            revolutionChangeEffect: null,
            invasionEffect: null,
            summonedThisTurn: new Set<string>(),
            activatingEffect: null,
            inspectedStackCardId: null,
            draggingCardId: null,
        };
    }),

    initializeGame: (p1Deck, p2Deck) => set(() => {
        const convertToGameCard = (card: any, owner: PlayerId, index: number, prefix: string): GameCard => {
            return {
                id: `${owner}_${prefix}_${index}_${card.name_ja || card.name}`,
                name: card.name_ja || card.name,
                nameJa: card.name_ja,
                nameEn: card.name_en,
                image: card.image_url || card.image,
                description: card.abilities_ja || card.description || "",
                descriptionJa: card.abilities_ja,
                descriptionEn: card.abilities_en,
                manaCost: card.cost || card.manaCost || 0,
                attack: card.power || card.attack || 0,
                civilization: card.civilization || "Neutral",
                raceEn: card.raceEn || card.race_en || card.race || card.subtype,
                raceJa: card.raceJa || card.race_ja,
                typeEn: card.typeEn || card.type_en || card.type || card.card_type,
                typeJa: card.typeJa || card.type_ja,
                mana: card.mana,
                rarity: card.rarity,
                illustrator: card.illustrator,
                primary_set: card.primary_set,
                sets: card.sets,
                hyperpower: card.hyper_power || card.hyperpower,
                source_url: card.source_url,
                color: '#3b82f6',
                position: 'vertical',
                face: 'down',
                owner,
                backs: card.backs?.map((b: any) => ({
                    name: b.name,
                    image_url: b.image_url,
                    mana: b.mana,
                    power: b.power,
                    cost: b.cost,
                    civilization: b.civilization,
                    abilities_ja: b.abilities_ja,
                    abilities_en: b.abilities_en,
                    type_ja: b.type_ja || b.typeJa,
                    type_en: b.type_en || b.typeEn,
                    race_ja: b.race_ja || b.raceJa,
                    race_en: b.race_en || b.raceEn
                }))
            };
        };

        const initPlayerCards = (owner: PlayerId, customDeck?: any[]) => {
            let main: GameCard[] = [];
            let hyper: GameCard[] = [];
            let gzoneDeck: GameCard[] = [];

            if (customDeck && customDeck.length > 0) {
                customDeck.forEach((c, i) => {
                    const gc = convertToGameCard(c, owner, i, 'custom');
                    const type = (gc.typeJa || gc.typeEn || "").toLowerCase();

                    if (type.includes("psychic") || type.includes("dragheart")) {
                        hyper.push(gc);
                    } else if (type.includes("gr creature")) {
                        gzoneDeck.push(gc);
                    } else {
                        main.push(gc);
                    }
                });
            } else {
                main = generateDeck(40, 'main', owner);
                hyper = generateDeck(8, 'hyper', owner);
                gzoneDeck = generateDeck(4, 'gZone', owner);
            }

            gzoneDeck.forEach(c => { c.face = 'down'; });
            hyper.forEach(c => { c.face = 'up'; });

            const shuffledMainIds = main.map(c => c.id).sort(() => Math.random() - 0.5);
            const drawnShields = shuffledMainIds.splice(0, 5);
            const initialHand = shuffledMainIds.splice(0, 5);

            const allPcards = [...main, ...hyper, ...gzoneDeck];
            drawnShields.forEach(id => {
                const c = allPcards.find(card => card.id === id);
                if (c) c.face = 'down';
            });
            initialHand.forEach(id => {
                const c = allPcards.find(card => card.id === id);
                if (c) c.face = 'up';
            });

            return {
                cardsList: allPcards,
                zonesPart: {
                    [`${owner}_hand`]: initialHand,
                    [`${owner}_mainDeck`]: shuffledMainIds,
                    [`${owner}_shields`]: drawnShields,
                    [`${owner}_manaZone`]: [],
                    [`${owner}_attackZone_front`]: [],
                    [`${owner}_attackZone_back`]: [],
                    [`${owner}_cemetery`]: [],
                    [`${owner}_banishZone`]: [],
                    [`${owner}_hyperspatial`]: hyper.map(c => c.id),
                    [`${owner}_gZone`]: gzoneDeck.map(c => c.id),
                    [`${owner}_legendary`]: [],
                    [`${owner}_drawerZone`]: [],
                    [`${owner}_extraZone`]: [],
                }
            };
        };

        const p1Data = initPlayerCards('p1', p1Deck);
        const p2Data = initPlayerCards('p2', p2Deck);

        const allCards = [...p1Data.cardsList, ...p2Data.cardsList].reduce((acc, card) => {
            acc[card.id] = card;
            return acc;
        }, {} as Record<string, GameCard>);

        return {
            cards: allCards,
            zones: {
                ...p1Data.zonesPart,
                ...p2Data.zonesPart,
            } as Record<ZoneName, string[]>,
            currentPlayer: 'p1',
            currentPhase: 'Start',
            myRole: 'p1',
            selectedCardIds: [],
            targetingMode: { active: false, sourceId: null, type: null },
            combatLinks: [],
            floatingShields: [],
            revealedShieldIds: [],
            peekingShieldIds: [],
            activeTriggerEffect: null,
            revolutionChangeEffect: null,
            invasionEffect: null,
            summonedThisTurn: new Set<string>(),
            activatingEffect: null,
            inspectedStackCardId: null,
            draggingCardId: null,
        };
    })
}));
