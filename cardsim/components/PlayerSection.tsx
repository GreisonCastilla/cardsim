"use client";

import React from "react";
import { cn } from "../lib/utils";
import { GameCard, ZoneName, PlayerId } from "../store/gameStore";
import { BattleZone } from "./BattleZone";
import { ResourceArea } from "./ResourceArea";
import { ShieldZoneWidget } from "./ShieldZoneWidget";
import { ManaZoneStrip } from "./ManaZoneStrip";
import { HyperspatialWidget } from "./HyperspatialWidget";
import { GZoneWidget } from "./GZoneWidget";

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
  handleDeckClick: (pid: PlayerId) => void;
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
  handleDeckClick,
  setIsBattleHovered,
}: PlayerSectionProps) {

  const rot = flipped ? "rotate-180" : "";

  return (
    <div className={cn(
      "grid h-full w-full relative z-10 overflow-hidden",
      "grid-rows-[55%_22.5%_22.5%]",
      flipped ? "pb-[3.8rem] rotate-180" : "pb-[3.8rem]"
    )}>
      {/* ─── Battle Zone (Flexible, takes remaining space) ─── */}
      <BattleZone
        pid={pid}
        rot={rot}
        zones={zones}
        cards={cards}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
        handleContextMenu={handleContextMenu}
        setIsBattleHovered={setIsBattleHovered}
      />

      {/* ─── Shield Zone Strip (Row 2, closer to center) ─── */}
      <ShieldZoneWidget
        pid={pid}
        zones={zones}
        cards={cards}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
        handleContextMenu={handleContextMenu}
        flipped={flipped}
      />

      {/* ─── Mana Zone Strip (Row 3, closer to hand) ─── */}
      <ManaZoneStrip
        pid={pid}
        zones={zones}
        cards={cards}
        handleCardHover={handleCardHover}
        handleCardClick={handleCardClick}
        handleCardDoubleClick={handleCardDoubleClick}
        handleContextMenu={handleContextMenu}
        flipped={flipped}
      />

      {/* ─── Extra Zones (Hyperspatial & G Zone) - Absolutely Positioned on Left Flank ─── */}
      <div className={cn(
        "absolute bottom-0 z-50 flex items-center pointer-events-auto gap-4",
        flipped ? "right-[4%] rotate-180 flex-row-reverse" : "left-[4%] flex-row"
      )}>
        <HyperspatialWidget
          pid={pid}
          zones={zones}
          cards={cards}
          handleCardHover={handleCardHover}
          handleContextMenu={handleContextMenu}
        />
        <GZoneWidget
          pid={pid}
          zones={zones}
          cards={cards}
          handleCardHover={handleCardHover}
          handleContextMenu={handleContextMenu}
        />
      </div>

      {/* ─── Resource Area (Deck, Graveyard, Abyss) - Absolutely Positioned on Right Flank ─── */}
      <div className={cn(
        "absolute bottom-0 z-50 pointer-events-auto",
        flipped ? "left-[4%]" : "right-[4%]"
      )}>
        <ResourceArea
          pid={pid}
          rot={flipped ? "rotate-180" : ""}
          f={flipped}
          zones={zones}
          cards={cards}
          handleCardHover={handleCardHover}
          handleCardClick={handleCardClick}
          handleCardDoubleClick={handleCardDoubleClick}
          handleContextMenu={handleContextMenu}
          handleDeckClick={handleDeckClick}
          setViewingZone={setViewingZone}
        />
      </div>

    </div>
  );
}
