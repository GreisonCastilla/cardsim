import { create } from 'zustand';

export type CardPosition = 'vertical' | 'horizontal';
export type CardFace = 'up' | 'down';
export type PlayerId = 'p1' | 'p2';

export interface GameCard {
    id: string;
    name: string;
    image?: string;
    description: string;
    manaCost: number;
    attack: number;
    color: string;
    position: CardPosition;
    face: CardFace;
    owner: PlayerId;
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
    | 'p1_gachi' | 'p2_gachi';

interface GameState {
    cards: Record<string, GameCard>;
    zones: Record<ZoneName, string[]>;

    drawCards: (playerId: PlayerId, amount: number) => void;
    shuffleDeck: (playerId: PlayerId) => void;
    moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName, newIndex?: number) => void;
    toggleTapped: (cardId: string) => void;
    toggleFace: (cardId: string) => void;
    endTurn: (playerId: PlayerId) => void;
    initializeGame: () => void;
}

const generateDeck = (count: number, prefix: string, owner: PlayerId): GameCard[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `${owner}_${prefix}_${i}`,
        name: `Carta Blanca ${prefix} ${i + 1}`,
        description: `Esta es una carta de prueba generada para ${owner.toUpperCase()}.`,
        manaCost: Math.floor(Math.random() * 8) + 1,
        attack: (Math.floor(Math.random() * 10) + 1) * 1000,
        color: 'white',
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
    p1_gachi: [], p2_gachi: [],
});

export const useGameStore = create<GameState>((set) => ({
    cards: {},
    zones: createInitialZones(),

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

    moveCard: (cardId, fromZone, toZone, newIndex) => set((state) => {
        const fromArray = [...state.zones[fromZone]];
        const toArray = [...state.zones[toZone]];

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

        if (toZoneLower.includes('shields') || toZoneLower.includes('maindeck') || toZoneLower.includes('gachi')) {
            updatedCard.face = 'down';
        } else {
            updatedCard.face = 'up';
        }

        updatedCard.position = 'vertical';

        return {
            cards: { ...state.cards, [cardId]: updatedCard },
            zones: {
                ...state.zones,
                [fromZone]: fromArray,
                [toZone]: toArray,
            }
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
            const gachi = generateDeck(4, 'gachi', owner);

            gachi.forEach(c => c.face = 'down');
            hyper.forEach(c => c.face = 'up');

            const allPcards = [...main, ...hyper, ...gachi];

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
                    [`${owner}_gachi`]: gachi.map(c => c.id),
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
            } as Record<ZoneName, string[]>
        };
    })
}));
