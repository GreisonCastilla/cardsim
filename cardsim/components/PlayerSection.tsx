"use client";

import React from "react";
import { cn } from "../lib/utils";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { BattleZone } from "./BattleZone";
import { ResourceArea } from "./ResourceArea";
import { SideHud } from "./SideHud";

interface PlayerSectionProps {
  pid: PlayerId;
  flipped?: boolean;
  zones: Record<ZoneName, string[]>;
  cards: Record<string, GameCard>;
  setViewingZone: (state: any) => void;
  handleCardHover: (card: GameCard | null, zone?: ZoneName) => void;
  handleCardClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleCardDoubleClick: (card: GameCard, event?: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent, card: GameCard, zone: ZoneName) => void;
  setIsBattleHovered: (hovered: boolean) => void;
}

export function PlayerSection({
  pid,
  flipped = false,
  zones,
  cards,
  setViewingZone,
  handleCardHover,
  handleCardClick,
  handleCardDoubleClick,
  handleContextMenu,
  setIsBattleHovered,
}: PlayerSectionProps) {
  const rot = flipped ? "rotate-180" : "";

  return (
    <div className={cn("grid grid-rows-[60%_40%] h-[50vh] w-full relative z-10 overflow-hidden", rot)}>
      <BattleZone
        pid={pid}
        rot={rot}
        zones={zones}
        cards={cards}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
        setIsBattleHovered={setIsBattleHovered}
      />

      <ResourceArea
        pid={pid}
        rot={rot}
        f={flipped}
        zones={zones}
        cards={cards}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
        handleContextMenu={handleContextMenu}
      />

      <SideHud
        pid={pid}
        f={flipped}
        zones={zones}
        cards={cards}
        setViewingZone={setViewingZone}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
      />
    </div>
  );
}
