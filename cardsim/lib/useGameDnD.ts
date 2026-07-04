"use client";

import { useRef, useCallback } from "react";
import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { GameCard, ZoneName, useGameStore } from "../store/gameStore";

interface DnDProps {
    zones: Record<ZoneName, string[]>;
    moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName, newIndex?: number, boardX?: number | null, boardY?: number | null) => void;
    showNotification: (msg: string, type?: 'error' | 'info') => void;
    setActiveCard: (card: GameCard | null) => void;
    setPreviewCard: (card: GameCard | null) => void;
    previewTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    selectedCardIds?: string[];
    moveCardsBatch?: (cardIds: string[], toZone: ZoneName) => void;
    clearSelection?: () => void;
    onEvolveRequest?: (sourceId: string, targetId: string, fromZone: ZoneName, toZone: ZoneName) => void;
    onShieldStackRequest?: (sourceId: string, targetId: string, fromZone: ZoneName, toZone: ZoneName) => void;
    onManaRequest?: (cardIds: string[], fromZone: ZoneName, toZone: ZoneName) => void;
}

export function useGameDnD({
    zones,
    moveCard,
    showNotification,
    setActiveCard,
    setPreviewCard,
    previewTimerRef,
    selectedCardIds = [],
    moveCardsBatch,
    clearSelection,
    onEvolveRequest,
    onShieldStackRequest,
    onManaRequest,
}: DnDProps) {
    const stateCards = useGameStore(s => s.cards);
    const setDraggingCardId = useGameStore(s => s.setDraggingCardId);
    const isDragging = useRef(false);

    const handleDragStart = useCallback((e: DragStartEvent) => {
        setPreviewCard(null);
        if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
            previewTimerRef.current = null;
        }

        const card = e.active.data.current?.card as GameCard | undefined;
        if (card) {
            setActiveCard(card);
            setDraggingCardId(card.id);
            isDragging.current = true;
        }
    }, [setActiveCard, setPreviewCard, previewTimerRef, setDraggingCardId]);

    const handleDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        setActiveCard(null);
        setDraggingCardId(null);
        setTimeout(() => { isDragging.current = false; }, 50);

        const cardId = active.id as string;
        const sourceCard = active.data.current?.card as GameCard | undefined;

        // 1. Determine fromZone
        let fromZone: ZoneName | undefined;
        for (const [z, ids] of Object.entries(zones)) {
            if ((ids as string[]).includes(cardId)) { fromZone = z as ZoneName; break; }
        }

        if (!fromZone || !over) return;

        // 2. Determine if target is a Card or a Zone
        let isTargetingCard = over?.data.current?.isCard;
        let targetCard = over?.data.current?.card as GameCard | undefined;

        // Fallback: if over.id is a card ID but data is missing
        if (!isTargetingCard && stateCards[over.id as string]) {
            isTargetingCard = true;
            targetCard = stateCards[over.id as string];
        }

        let toZone: ZoneName | undefined;
        let newIndex: number | undefined;

        if (over.id.toString().includes('drawerZone') || over.id.toString().includes('extraZone')) {
            toZone = over.id as ZoneName;
        } else if (isTargetingCard && targetCard) {
            // Find which zone the target card belongs to and the index
            for (const [z, ids] of Object.entries(zones)) {
                const idx = (ids as string[]).indexOf(targetCard.id);
                if (idx !== -1) {
                    toZone = z as ZoneName;
                    newIndex = idx;
                    break;
                }
            }
        } else {
            // Check if over.id is a valid zone
            if (Object.keys(zones).includes(over.id as string)) {
                toZone = over.id as ZoneName;
            } else {
                // If over.id is not a zone, maybe it's a card that didn't have isCard: true?
                for (const [z, ids] of Object.entries(zones)) {
                    if ((ids as string[]).includes(over.id as string)) {
                        toZone = z as ZoneName;
                        break;
                    }
                }
            }
        }

        if (!toZone || !zones[toZone]) return;

        // 3. Logic for Evolution/Stacking Drop (PRIORITY)
        if (isTargetingCard && targetCard && sourceCard && cardId !== targetCard.id) {
            const source = stateCards[cardId];
            const type = (source?.typeEn || source?.typeJa || (source as any)?.type_en || (source as any)?.type_ja || "").toLowerCase();
            const isEvolution = type.includes("evolution") || type.includes("neo") || type.includes("g-neo");

            // Intelligent Detection:
            // 1. If it's an Evolution card -> Always ask (Evolve logic)
            // 2. If it's from a different zone (e.g. Hand to Battle) -> Always ask (Stack logic)
            // 3. If it's same zone move (Field to Field) AND not evolution -> Just reorder/move (No modal)

            const isSameZoneMove = fromZone === toZone;
            const isTargetInBattleZone = toZone?.includes('attackZone');
            const isTargetInShieldZone = toZone?.includes('shields');

            if (isTargetInBattleZone && onEvolveRequest && (isEvolution || !isSameZoneMove)) {
                onEvolveRequest(cardId, targetCard.id, fromZone, toZone);
                return;
            }

            if (isTargetInShieldZone && onShieldStackRequest) {
                onShieldStackRequest(cardId, targetCard.id, fromZone, toZone);
                return;
            }
        }

        if (isTargetingCard && targetCard) {
            // Reordering logic
            if (fromZone !== toZone || (newIndex !== undefined)) {
                moveCard(cardId, fromZone, toZone, newIndex);
            }
        } else if (fromZone !== toZone) {
            // Logic for dropping on a zone
            if (toZone.includes('manaZone') && onManaRequest) {
                const cardIds = selectedCardIds.includes(cardId) ? selectedCardIds : [cardId];
                onManaRequest(cardIds, fromZone, toZone);
                return;
            }

            if (selectedCardIds.includes(cardId) && moveCardsBatch) {
                moveCardsBatch(selectedCardIds, toZone);
                clearSelection?.();
            } else {
                moveCard(cardId, fromZone, toZone);
            }
        }
    }, [zones, moveCard, showNotification, setActiveCard, selectedCardIds, moveCardsBatch, clearSelection, onEvolveRequest, onShieldStackRequest, onManaRequest, stateCards, setDraggingCardId]);

    const handleDragCancel = useCallback(() => {
        setActiveCard(null);
        setDraggingCardId(null);
        setTimeout(() => { isDragging.current = false; }, 50);
    }, [setActiveCard, setDraggingCardId]);

    return {
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
        isDragging,
    };
}
