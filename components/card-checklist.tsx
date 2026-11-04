"use client";

import { Check } from "lucide-react";
import { hasFoilTreatment, type DisplayCard } from "../lib/collection";
import { rarityFor } from "../lib/rarity";
import { deckCardKey, deckCardName, type DeckCopyGoal } from "../lib/deck-copy-limit";
import { DeckPips, RarityGem, setCode } from "./ledger";

export default function CardChecklist({ cards, goals, showNeed, onOpen }: { cards: DisplayCard[]; goals: Map<string, DeckCopyGoal>; showNeed: boolean; onOpen: (card: DisplayCard) => void }) {
  const ticked = cards.filter((card) => card.quantity > 0).length;
  return <section className="checklist" aria-label="Checklist">
    <p className="checklist-summary"><strong>{ticked}</strong> of {cards.length} ticked</p>
    <ol className="checklist-rows">
      {cards.map((card) => {
        const owned = card.quantity > 0;
        const rarity = rarityFor(card);
        const goal = goals.get(deckCardKey(card));
        const domain = (card.domains[0] ?? "Colorless").toLowerCase();
        return <li key={card.code} className={owned ? "owned" : "missing"}>
          <button type="button" onClick={() => onOpen(card)} aria-label={`${deckCardName(card)}, ${card.set} ${card.number}, ${rarity?.label ?? card.rarity}, ${owned ? `${card.quantity} owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}` : "not owned"}${showNeed && goal ? `, need ${goal.missing} more` : ""}`}>
            <span className="check-box" aria-hidden="true">{owned && <Check />}</span>
            <span className="check-number"><span className="check-set">{setCode(card.set)} </span>{card.number}</span>
            <span className="check-name"><span className={`check-domain domain-${domain}`} aria-hidden="true" /><span className="check-title">{card.name}</span></span>
            <RarityGem kind={rarity?.kind} />
            <DeckPips card={card} goal={goal} className="check-pips" />
            <span className={`check-qty${owned && hasFoilTreatment(card) ? " shiny" : ""}`}>{owned ? `×${card.quantity}` : "—"}</span>
          </button>
        </li>;
      })}
    </ol>
  </section>;
}
