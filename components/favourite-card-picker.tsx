"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import CardArtwork from "./card-artwork";
import { hasFoilTreatment, isAlternatePrinting, isOvernumbered, type DisplayCard } from "../lib/collection";
import { cardsById, cardIdFor } from "../lib/deck-builder";
import { rarityFor } from "../lib/rarity";

function printingRank(card: DisplayCard) {
  if (rarityFor(card)?.kind === "special") return 0;
  return ["Epic", "Rare", "Uncommon", "Common"].indexOf(card.rarity) + 1 || 5;
}

export function preferredFavouritePrinting(cards: DisplayCard[], id: string): string | undefined {
  return cards.filter((card) => card.quantity > 0 && cardIdFor(card) === id).sort((a, b) => printingRank(a) - printingRank(b) || a.code.localeCompare(b.code))[0]?.code;
}

export default function FavouriteCardPicker({ cards, selected, printingCodes, disabled, onSelect }: { cards: DisplayCard[]; selected: string[]; printingCodes: Record<string, string>; disabled: boolean; onSelect: (card: DisplayCard) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState("special");
  const [set, setSet] = useState("");
  const [domain, setDomain] = useState("");
  const owned = useMemo(() => cards.filter((card) => card.quantity > 0), [cards]);
  const sets = [...new Set(owned.map((card) => card.set))].sort();
  const domains = [...new Set(owned.flatMap((card) => card.domains))].sort();
  const visible = owned.filter((card) => {
    const name = cardsById.get(cardIdFor(card) ?? "")?.name ?? card.name;
    const matchesRarity = !rarity || (rarity === "alternate" ? isAlternatePrinting(card) : rarity === "overnumbered" ? isOvernumbered(card) : rarity === "showcase" ? card.rarity === "Showcase" : rarityFor(card)?.kind === rarity);
    return matchesRarity && (!set || card.set === set) && (!domain || card.domains.includes(domain)) && `${name} ${card.name} ${card.number}`.toLowerCase().includes(search.trim().toLowerCase());
  }).sort((a, b) => printingRank(a) - printingRank(b) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  function reset() { setSearch(""); setRarity(""); setSet(""); setDomain(""); }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="secondary-button" type="button" disabled={disabled} onClick={() => { setSearch(""); setRarity("special"); setSet(""); setDomain(""); }}><Search aria-hidden="true" />Choose favourite cards{selected.length ? ` (${selected.length}/5)` : ""}</button></DialogTrigger>
    <DialogContent className="favourite-picker-dialog">
      <div className="favourite-picker-heading"><DialogTitle>Choose favourite cards</DialogTitle><DialogDescription>Pick up to 5 cards to build around.</DialogDescription></div>
      <div className="favourite-picker-filters">
        <label className="favourite-picker-search"><span>Name</span><div><Search aria-hidden="true" /><input autoComplete="off" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your cards" /></div></label>
        <label><span>Rarity &amp; printing</span><select value={rarity} onChange={(e) => setRarity(e.target.value)}><option value="special">Special printings</option><option value="">All printings</option><option value="alternate">Alternate art</option><option value="overnumbered">Over-numbered</option><option value="showcase">Showcase</option><option value="epic">Epic</option><option value="rare">Rare</option><option value="uncommon">Uncommon</option><option value="common">Common</option></select></label>
        <label><span>Set</span><select value={set} onChange={(e) => setSet(e.target.value)}><option value="">All sets</option>{sets.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Domain</span><select value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">All domains</option>{domains.map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className="favourite-picker-count"><span>{visible.length} owned printings</span><button type="button" onClick={reset}>Show all my cards</button></div>
      <div className="favourite-picker-scroll">
        {visible.length ? <div className="favourite-picker-grid">{visible.map((card) => {
          const id = cardIdFor(card);
          const playable = id ? cardsById.get(id) : undefined;
          const eligible = playable && ["Unit", "Spell", "Gear"].includes(playable.type);
          const preferredCode = id ? printingCodes[id] ?? preferredFavouritePrinting(owned, id) : undefined;
          const chosen = Boolean(id && selected.includes(id) && preferredCode === card.code);
          const limitReached = selected.length >= 5 && (!id || !selected.includes(id));
          const label = rarityFor(card)?.label ?? card.rarity;
          return <button type="button" className={`favourite-picker-card${chosen ? " selected" : ""}`} key={card.code} disabled={!eligible || limitReached} aria-pressed={chosen} aria-label={`${chosen ? "Remove" : "Choose"} ${playable?.name ?? card.name}, ${label}, ${card.set} ${card.number}, ${card.quantity} owned${!eligible ? ", not a main-deck card" : ""}`} onClick={() => onSelect(card)}>
            <div className={`card-frame${hasFoilTreatment(card) ? " shiny" : ""}`}><div className="card-image-wrap"><CardArtwork src={card.image} alt={`${playable?.name ?? card.name} ${card.number}`} lazy /><span className="quantity-badge">{card.quantity}</span>{chosen && <span className="favourite-picked"><Check aria-hidden="true" /></span>}</div></div>
            <strong>{playable?.name ?? card.name}</strong><span>{label}</span><small>{card.set} · {card.number.toUpperCase()}</small>{!eligible && <small>Not a main-deck card</small>}
          </button>;
        })}</div> : <div className="favourite-picker-empty"><p>{owned.length ? "No owned cards match these filters." : "Import your collection to choose favourites."}</p>{owned.length > 0 && <button className="secondary-button" type="button" onClick={reset}>Show all my cards</button>}</div>}
      </div>
      <div className="favourite-picker-footer"><span role="status">{selected.length}/5 favourites selected</span><button className="primary-button" type="button" onClick={() => setOpen(false)}>Done</button></div>
    </DialogContent>
  </Dialog>;
}
