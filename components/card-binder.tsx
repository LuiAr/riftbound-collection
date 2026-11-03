"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { hasFoilTreatment, type DisplayCard } from "../lib/collection";
import { rarityFor } from "../lib/rarity";
import { deckCardName } from "../lib/deck-copy-limit";

export type BinderLayout = 2 | 3;

const SPREAD_MIN_WIDTH = 760;
const SWIPE_DISTANCE = 48;

export default function CardBinder({ cards, layout, onOpen }: { cards: DisplayCard[]; layout: BinderLayout; onOpen: (card: DisplayCard) => void }) {
  const root = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const [spread, setSpread] = useState(false);
  const [anchor, setAnchor] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setSpread(element.clientWidth >= SPREAD_MIN_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const perPage = layout * layout;
  const pagesShown = spread ? 2 : 1;
  const perView = perPage * pagesShown;
  const pageCount = Math.max(1, Math.ceil(cards.length / perPage));
  const viewCount = Math.max(1, Math.ceil(pageCount / pagesShown));
  const view = Math.min(Math.floor(anchor / perView), viewCount - 1);
  const firstPage = view * pagesShown;
  const lastPage = Math.min(firstPage + pagesShown, pageCount);
  const pageLabel = spread && lastPage - firstPage > 1 ? `${firstPage + 1}–${lastPage}` : `${firstPage + 1}`;

  function goTo(next: number) {
    const target = Math.max(0, Math.min(next, viewCount - 1));
    if (target === view) return;
    setDirection(target > view ? "next" : "previous");
    setAnchor(target * perView);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); goTo(view + 1); }
    else if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); goTo(view - 1); }
    else if (event.key === "Home") { event.preventDefault(); goTo(0); }
    else if (event.key === "End") { event.preventDefault(); goTo(viewCount - 1); }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    swiped.current = false;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    goTo(dx < 0 ? view + 1 : view - 1);
  }

  const pages = Array.from({ length: pagesShown }, (_, offset) => {
    const page = firstPage + offset;
    const start = page * perPage;
    const slots: (DisplayCard | null)[] = Array.from({ length: perPage }, (_, index) => cards[start + index] ?? null);
    return { page, slots, blank: page >= pageCount };
  });

  return <section ref={root} className="binder" aria-roledescription="binder" aria-label="Binder" onKeyDown={onKeyDown} style={{ "--binder-pages": pagesShown, "--binder-layout": layout } as CSSProperties}>
    <div className="binder-bar">
      <button type="button" className="binder-step" onClick={() => goTo(view - 1)} disabled={view === 0} aria-label="Previous page"><ChevronLeft aria-hidden="true" /></button>
      <p className="binder-count" aria-live="polite"><span className="visually-hidden">{spread ? "Pages" : "Page"} </span><strong>{pageLabel}</strong><span aria-hidden="true"> / </span><span className="visually-hidden"> of </span>{pageCount}</p>
      <input className="binder-slider" type="range" min={0} max={viewCount - 1} step={1} value={view} disabled={viewCount < 2} onChange={(event) => goTo(Number(event.target.value))} aria-label="Binder page" aria-valuetext={`${spread ? "Pages" : "Page"} ${pageLabel} of ${pageCount}`} style={{ "--progress": viewCount > 1 ? view / (viewCount - 1) : 0 } as CSSProperties} />
      <button type="button" className="binder-step" onClick={() => goTo(view + 1)} disabled={view >= viewCount - 1} aria-label="Next page"><ChevronRight aria-hidden="true" /></button>
    </div>
    <div className={`binder-cover layout-${layout}${spread ? " spread" : ""}`} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }} onClickCapture={(event) => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
      {pages.map(({ page, slots, blank }, offset) => <div className={`binder-page${offset === 0 ? " left" : " right"}`} key={`${page}-${layout}`} data-direction={direction} role="group" aria-label={blank ? "Empty page" : `Page ${page + 1} of ${pageCount}`}>
        {offset === 0 && <span className="binder-rings" aria-hidden="true"><span /><span /><span /></span>}
        <div className="binder-pockets">{slots.map((card, index) => card ? <BinderPocket key={card.code} card={card} onOpen={onOpen} /> : <span className="binder-pocket empty" key={`empty-${index}`} aria-hidden="true" />)}</div>
        <span className="binder-folio" aria-hidden="true">{blank ? "" : page + 1}</span>
      </div>)}
    </div>
    <p className="binder-hint">Swipe, use the arrow keys or drag the slider to turn pages.</p>
  </section>;
}

function BinderPocket({ card, onOpen }: { card: DisplayCard; onOpen: (card: DisplayCard) => void }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const shiny = hasFoilTreatment(card);
  const rarity = rarityFor(card);
  const owned = card.quantity > 0;
  const label = `View ${deckCardName(card)} larger, ${card.set} ${card.number.toUpperCase()}, ${rarity?.label ?? (card.rarity === "Unknown" ? "unknown rarity" : card.rarity)}, ${owned ? `${card.quantity} owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}` : "not owned"}`;
  return <button type="button" className={`binder-pocket${owned ? "" : " missing"}${shiny ? " shiny" : ""}`} onClick={() => onOpen(card)} aria-label={label} title={deckCardName(card)}>
    <span className="binder-card">
      {card.image && failedSource !== card.image ? <img src={card.image} alt="" draggable={false} onError={() => setFailedSource(card.image)} /> : <span className="no-image"><ImageOff aria-hidden="true" /><span>{card.name}</span></span>}
      <span className="binder-number">#{card.number}</span>
      {owned && <span className={`quantity-badge${shiny ? " shiny" : ""}`}>×{card.quantity}</span>}
    </span>
  </button>;
}
