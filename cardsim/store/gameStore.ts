import { create } from 'zustand';

export type CardPosition = 'vertical' | 'horizontal';
export type CardFace = 'up' | 'down';
export type PlayerId = 'p1' | 'p2';
export type PhaseName = 'Start' | 'Untap' | 'Draw' | 'Mana' | 'Main' | 'Attack' | 'End';

export const PHASES: PhaseName[] = ['Start', 'Untap', 'Draw', 'Mana', 'Main', 'Attack', 'End'];

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
    color: string;
    position: CardPosition;
    face: CardFace;
    owner: PlayerId;
    boardX?: number | null;
    boardY?: number | null;
    linkedCardIds?: string[];
}

// Flat structure helps DndKit.
export type ZoneName =
    | 'p1_hand' | 'p2_hand'
    | 'p1_mainDeck' | 'p2_mainDeck'
    | 'p1_shields' | 'p2_shields'
    | 'p1_manaZone' | 'p2_manaZone'
    | 'p1_attackZone' | 'p2_attackZone'
    | 'p1_cemetery' | 'p2_cemetery'
    | 'p1_banishZone' | 'p2_banishZone'
    | 'p1_hyperspatial' | 'p2_hyperspatial'
    | 'p1_gZone' | 'p2_gZone';

interface GameState {
    cards: Record<string, GameCard>;
    zones: Record<ZoneName, string[]>;
    currentPlayer: PlayerId;
    currentPhase: PhaseName;

    drawCards: (playerId: PlayerId, amount: number) => void;
    shuffleDeck: (playerId: PlayerId) => void;
    moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName, newIndex?: number, boardX?: number | null, boardY?: number | null) => void;
    topToMana: (playerId: PlayerId) => void;
    topToShield: (playerId: PlayerId) => void;
    topToGraveyard: (playerId: PlayerId, amount: number) => void;
    toggleTapped: (cardId: string) => void;
    toggleFace: (cardId: string) => void;
    untapAll: (playerId: PlayerId) => void;
    nextPhase: () => void;
    endTurn: (playerId: PlayerId) => void; // Keep for fallback, or maybe remove later
    initializeGame: () => void;
    linkCard: (childId: string, parentId: string, fromZone: ZoneName) => void;
    unlinkCard: (childId: string, parentId: string, toZone: ZoneName, newIndex?: number) => void;
}

const generateDeck = (count: number, prefix: string, owner: PlayerId): GameCard[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `${owner}_${prefix}_${i}`,
        name: `Carta Blanca ${prefix} ${i + 1}`,
        description: `Esta es una carta de prueba generada para ${owner.toUpperCase()}.`,
        manaCost: Math.floor(Math.random() * 8) + 1,
        attack: (Math.floor(Math.random() * 10) + 1) * 1000,
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
    p1_attackZone: [], p2_attackZone: [],
    p1_cemetery: [], p2_cemetery: [],
    p1_banishZone: [], p2_banishZone: [],
    p1_hyperspatial: [], p2_hyperspatial: [],
    p1_gZone: [], p2_gZone: [],
});

export const useGameStore = create<GameState>((set) => ({
    cards: {},
    zones: createInitialZones(),
    currentPlayer: 'p1',
    currentPhase: 'Start',

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

    shuffleDeck: (playerId) => set((state) => {
        const deckKey = `${playerId}_mainDeck` as ZoneName;
        const shuffled = [...state.zones[deckKey]].sort(() => Math.random() - 0.5);
        return {
            zones: {
                ...state.zones,
                [deckKey]: shuffled,
            }
        };
    }),

    moveCard: (cardId, fromZone, toZone, newIndex, boardX, boardY) => set((state) => {
        const isSameZone = fromZone === toZone;
        const fromArray = [...state.zones[fromZone]];
        const toArray = isSameZone ? fromArray : [...state.zones[toZone]];

        const index = fromArray.indexOf(cardId);
        if (index === -1) return state;

        fromArray.splice(index, 1);

        if (newIndex !== undefined) {
            toArray.splice(newIndex, 0, cardId);
        } else {
            toArray.push(cardId);
        }

        const updatedCard = { ...state.cards[cardId] };
        const toZoneLower = toZone.toLowerCase();

        // Sandbox Adaptive Logic
        if (toZoneLower.includes('shields') || toZoneLower.includes('maindeck') || toZoneLower.includes('gzone')) {
            updatedCard.face = 'down';
        } else {
            updatedCard.face = 'up';
        }

        // Tapped state: usually untaped when moved unless it's a specific action, 
        // but for sandbox we reset position to vertical unless it's already there.
        // If moving to mana, we keep its previous tapped state or reset? 
        // User says "si cae en Mana, permite girarla", implying it starts untaped or keeps state.
        // We'll reset to vertical for clarity unless it's being moved within battle zone (manual positioning).
        if (!isSameZone) {
            updatedCard.position = 'vertical';
        }

        if (boardX !== undefined) updatedCard.boardX = boardX;
        if (boardY !== undefined) updatedCard.boardY = boardY;

        // Limpiar posicionamiento libre si vuelve a su origen, especialmente escudos/maná
        // O si el usuario pide null explícitamente.
        if (boardX === null) delete updatedCard.boardX;
        if (boardY === null) delete updatedCard.boardY;

        const newZones = { ...state.zones, [fromZone]: fromArray };
        if (!isSameZone) {
            newZones[toZone] = toArray;
        }

        return {
            cards: { ...state.cards, [cardId]: updatedCard },
            zones: newZones
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

    toggleFace: (cardId) => set((state) => ({
        cards: {
            ...state.cards,
            [cardId]: {
                ...state.cards[cardId],
                face: state.cards[cardId].face === 'up' ? 'down' : 'up'
            }
        }
    })),

    untapAll: (playerId) => set((state) => {
        const attackKey = `${playerId}_attackZone` as ZoneName;
        const manaKey = `${playerId}_manaZone` as ZoneName;
        const newCards = { ...state.cards };

        state.zones[attackKey].forEach(id => {
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

        if (nextPhaseName === 'Untap') {
            const attackKey = `${nextPlayer}_attackZone` as ZoneName;
            const manaKey = `${nextPlayer}_manaZone` as ZoneName;
            state.zones[attackKey].forEach(id => {
                newCards[id] = { ...newCards[id], position: 'vertical' };
            });
            state.zones[manaKey].forEach(id => {
                newCards[id] = { ...newCards[id], position: 'vertical' };
            });
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
            zones: newZones
        };
    }),

    linkCard: (childId, parentId, fromZone) => set((state) => {
        if (childId === parentId) return state; // No card should link to itself
        const fromArray = [...state.zones[fromZone]];
        const index = fromArray.indexOf(childId);
        if (index === -1) return state;

        fromArray.splice(index, 1);

        const parentCard = { ...state.cards[parentId] };
        const childCard = { ...state.cards[childId], face: 'down' as CardFace, boardX: null, boardY: null };

        const linkedIds = [...(parentCard.linkedCardIds || [])];
        if (!linkedIds.includes(childId)) {
            linkedIds.push(childId);
        }
        parentCard.linkedCardIds = linkedIds;

        return {
            zones: { ...state.zones, [fromZone]: fromArray },
            cards: { ...state.cards, [childId]: childCard, [parentId]: parentCard }
        };
    }),

    unlinkCard: (childId, parentId, toZone, newIndex) => set((state) => {
        const parentCard = { ...state.cards[parentId] };
        if (!parentCard.linkedCardIds?.includes(childId)) return state;

        const linkedIds = parentCard.linkedCardIds.filter(id => id !== childId);
        parentCard.linkedCardIds = linkedIds;

        const childCard = { ...state.cards[childId], face: 'up' as CardFace };
        const toArray = [...state.zones[toZone]];

        if (newIndex !== undefined) {
            toArray.splice(newIndex, 0, childId);
        } else {
            toArray.push(childId);
        }

        return {
            zones: { ...state.zones, [toZone]: toArray },
            cards: { ...state.cards, [childId]: childCard, [parentId]: parentCard }
        };
    }),

    endTurn: (playerId) => set((state) => {
        const attackKey = `${playerId}_attackZone` as ZoneName;
        const manaKey = `${playerId}_manaZone` as ZoneName;

        const newCards: Record<string, GameCard> = { ...state.cards };

        state.zones[attackKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' as CardPosition };
        });

        state.zones[manaKey].forEach(id => {
            newCards[id] = { ...newCards[id], position: 'vertical' as CardPosition };
        });

        return { cards: newCards };
    }),

    initializeGame: () => set(() => {
        const initPlayerCards = (owner: PlayerId) => {
            const main = generateDeck(40, 'main', owner);
            const hyper = generateDeck(8, 'hyper', owner);
            const gzoneDeck = generateDeck(4, 'gZone', owner);

            gzoneDeck.forEach(c => {
                c.face = 'down';
                c.linkedCardIds = [];
            });
            hyper.forEach(c => {
                c.face = 'up';
                c.linkedCardIds = [];
            });
            main.forEach(c => {
                c.linkedCardIds = [];
            });

            const allPcards = [...main, ...hyper, ...gzoneDeck];

            const shuffledMainIds = main.map(c => c.id).sort(() => Math.random() - 0.5);
            const drawnShields = shuffledMainIds.splice(0, 5);
            const initialHand = shuffledMainIds.splice(0, 5);

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
                    [`${owner}_attackZone`]: [],
                    [`${owner}_cemetery`]: [],
                    [`${owner}_banishZone`]: [],
                    [`${owner}_hyperspatial`]: hyper.map(c => c.id),
                    [`${owner}_gZone`]: gzoneDeck.map(c => c.id),
                }
            };
        };

        const p1Data = initPlayerCards('p1');
        const p2Data = initPlayerCards('p2');

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
            currentPhase: 'Start'
        };
    })
}));
