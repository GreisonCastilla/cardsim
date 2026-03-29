"use client";

import { useEffect } from "react";
import { PlayerId } from "../store/gameStore";

interface HotkeyState {
    currentPlayer: PlayerId;
    drawCards: (pid: PlayerId, amt: number) => void;
    untapAll: (pid: PlayerId) => void;
    nextPhase: () => void;
    previewCard: any;
    setPlacementMenu: (state: any) => void;
    setDeckMenu: (state: any) => void;
    setContextMenu: (state: any) => void;
    setViewingZone: (state: any) => void;
}

export function useGameHotkeys({
    currentPlayer,
    drawCards,
    untapAll,
    nextPhase,
    previewCard,
    setPlacementMenu,
    setDeckMenu,
    setContextMenu,
    setViewingZone,
}: HotkeyState) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. ESC to close all
            if (e.key === "Escape") {
                setPlacementMenu(null);
                setDeckMenu(null);
                setContextMenu(null);
                setViewingZone(null);
                return;
            }

            // 2. Global Hotkeys (only if not typing)
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            const key = e.key.toLowerCase();
            if (key === 'd') {
                drawCards(currentPlayer, 1);
            } else if (key === 'u') {
                untapAll(currentPlayer);
            } else if (key === ' ') {
                if (previewCard) return;
                e.preventDefault();
                nextPhase();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [currentPlayer, drawCards, untapAll, nextPhase, previewCard, setPlacementMenu, setDeckMenu, setContextMenu, setViewingZone]);
}
