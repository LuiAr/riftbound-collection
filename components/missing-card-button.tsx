"use client";

import { Maximize2 } from "lucide-react";
import type { DisplayCard } from "../lib/collection";
import { deckCardName } from "../lib/deck-copy-limit";
import CardArtwork from "./card-artwork";

export default function MissingCardButton({ card, name = deckCardName(card), detail, count, countLabel = "copies missing", onOpen }: { card: DisplayCard; name?: string; detail: string; count?: number; countLabel?: string; onOpen: (card: DisplayCard) => void }) {
  return <button type="button" className="missing-card-button" onClick={() => onOpen(card)} aria-label={`View ${name} larger, ${card.set}, ${card.number}${count ? `, ${count} ${countLabel}` : ""}`} aria-haspopup="dialog">
    <span className="missing-card-thumbnail"><CardArtwork src={card.image} alt="" lazy /></span>
    <span className="missing-card-copy"><strong>{name}</strong><small>{detail}</small></span>
    {count !== undefined && <span className="missing-card-count">{count}x</span>}
    <Maximize2 className="missing-card-expand" aria-hidden="true" />
  </button>;
}
