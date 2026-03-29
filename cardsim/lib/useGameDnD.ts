"use client";

import { useRef, useCallback } from "react";
import { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { GameCard, ZoneName } from "../store/gameStore";

interface DnDProps {
    zones: Record<ZoneName, string[]>;
    moveCard: (cardId: string, fromZone: ZoneName, toZone: ZoneName) => void;
    linkCard: (childId: string, parentId: string, fromZone: ZoneName) => void;
    showNotification: (msg: string, type?: 'error' | 'info') => void;
    setActiveCard: (card: GameCard | null) => void;
    setPreviewCard: (card: GameCard | null) => void;
    previewTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useGameDnD({
    zones,
    moveCard,
    linkCard,
    showNotification,
    setActiveCard,
    setPreviewCard,
    previewTimerRef,
}: DnDProps) {
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
            isDragging.current = true;
        }
    }, [setActiveCard, setPreviewCard, previewTimerRef]);

    const handleDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        setActiveCard(null);
        setTimeout(() => { isDragging.current = false; }, 50);

        const cardId = active.id as string;

        // 1. Determine fromZone
        let fromZone: ZoneName | undefined;
        for (const [z, ids] of Object.entries(zones)) {
            if ((ids as string[]).includes(cardId)) { fromZone = z as ZoneName; break; }
        }

        if (!fromZone || !over) return;

        // 2. Determine if target is a Card or a Zone
        const isTargetingCard = over?.data.current?.isCard;
        const targetCard = over?.data.current?.card as GameCard | undefined;

        let toZone: ZoneName | undefined;
        if (isTargetingCard && targetCard) {
            // Find which zone the target card belongs to
            for (const [z, ids] of Object.entries(zones)) {
                if ((ids as string[]).includes(targetCard.id)) { toZone = z as ZoneName; break; }
            }
        } else {
            toZone = over.id as ZoneName;
        }

        if (!toZone) return;

        // 3. Handle Linking (EXLife) vs Moving
        const isFromDeck = fromZone.includes('mainDeck');
        const isTargetInBattle = toZone.includes('attackZone');

        if (isTargetingCard && targetCard) {
            // Logic for dropping on another card
            if (isTargetInBattle) {
                if (isFromDeck) {
                    linkCard(cardId, targetCard.id, fromZone);
                } else {
                    showNotification("EXLife can only be added from the Deck.");
                }
            } else if (toZone.includes('shields')) {
                showNotification("You cannot add EXLife to Shield cards.");
            } else if (fromZone !== toZone) {
                // Just move to the zone if dropping on a card in Hand/Mana/etc.
                moveCard(cardId, fromZone, toZone);
            }
        } else if (fromZone !== toZone) {
            // Logic for dropping on a zone
            moveCard(cardId, fromZone, toZone);
        }
    }, [zones, moveCard, linkCard, showNotification, setActiveCard]);

    const handleDragCancel = useCallback(() => {
        setActiveCard(null);
        setTimeout(() => { isDragging.current = false; }, 50);
    }, [setActiveCard]);

    return {
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
        isDragging,
    };
}
