"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { displayCards, hasFoilTreatment, isAlternatePrinting, isOvernumbered, type DisplayCard, type ImportDifference } from "../lib/collection";
import { priceKey, type PriceQuote, type PriceSnapshot } from "../lib/prices";
import type { CollectionSnapshot } from "../lib/server-collection";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";

type Props = { initial: CollectionSnapshot; accountName: string; signOutPath: string };
type Preview = { difference: ImportDifference; version: number; filename: string; csv: string };
const sets = ["Vendetta", "Vendetta Promos", "Unleashed", "Origins", "Spiritforged", "Proving Grounds"];
const colors = ["Fury", "Calm", "Mind", "Body", "Order", "Chaos", "Colorless"];
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatPrice = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);
type PricedCard = { card: DisplayCard; amount: number; finish: "Standard" | "Foil" };

function quoteFor(card: DisplayCard, prices: PriceSnapshot | null): PriceQuote | null {
  if (card.extra) return null;
  return prices?.quotes[priceKey(card.set, card.name)] ?? null;
}

export default function CollectionClient({ initial, accountName, signOutPath }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedSet, setSelectedSet] = useState("Vendetta");
  const [status, setStatus] = useState("all");
  const [hideAlternates, setHideAlternates] = useState(false);
  const [hideOvernumbered, setHideOvernumbered] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [prices, setPrices] = useState<PriceSnapshot | null>(null);
  const [priceError, setPriceError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/prices").then(async (response) => {
      const result = await response.json() as PriceSnapshot & { error?: string };
      if (!response.ok) throw new Error(result.error || "Recent prices are unavailable.");
      return result;
    }).then((result) => { if (active) setPrices(result); }).catch((cause) => { if (active) setPriceError(cause instanceof Error ? cause.message : "Recent prices are unavailable."); });
    return () => { active = false; };
  }, []);

  const allCards = useMemo(() => displayCards(snapshot.rows), [snapshot.rows]);
  const setCards = useMemo(() => allCards.filter((card) => selectedSet === "All sets" || card.set === selectedSet), [allCards, selectedSet]);
  const visibleCards = useMemo(() => setCards.filter((card) => {
    if (status === "owned" && card.quantity === 0) return false;
    if (status === "missing" && card.quantity > 0) return false;
    if (hideAlternates && isAlternatePrinting(card)) return false;
    if (hideOvernumbered && isOvernumbered(card)) return false;
    const query = search.trim().toLowerCase();
    return !query || `${card.name} ${card.number} ${card.set}`.toLowerCase().includes(query);
  }).sort((a, b) => a.set.localeCompare(b.set) || a.number.localeCompare(b.number, undefined, { numeric: true }) || a.code.localeCompare(b.code)), [setCards, status, hideAlternates, hideOvernumbered, search]);
  const owned = setCards.filter((card) => card.quantity > 0).length;
  const copies = setCards.reduce((sum, card) => sum + card.quantity, 0);
  const foils = setCards.reduce((sum, card) => sum + card.foilQuantity, 0);
  const overallCopies = snapshot.rows.reduce((sum, row) => sum + Number(row.totalQtyOwned), 0);
  const setSummary = sets.map((set) => {
    const cards = allCards.filter((card) => card.set === set);
    return { set, owned: cards.filter((card) => card.quantity > 0).length, total: cards.length };
  }).filter((item) => item.total > 0);
  const colorSummary = colors.map((color) => {
    const cards = setCards.filter((card) => card.domains.includes(color));
    return { color, owned: cards.filter((card) => card.quantity > 0).length, total: cards.length };
  }).filter((item) => item.total > 0);
  const priceHighlights = useMemo(() => {
    const ownedCards: PricedCard[] = [];
    const watchCards: PricedCard[] = [];
    let pricedOwned = 0;
    for (const card of allCards) {
      const quote = quoteFor(card, prices);
      if (!quote) continue;
      if (card.quantity > 0) {
        const options: PricedCard[] = [];
        if (card.quantity > card.foilQuantity && quote.standard !== null) options.push({ card, amount: quote.standard, finish: "Standard" });
        if (card.foilQuantity > 0 && quote.foil !== null) options.push({ card, amount: quote.foil, finish: "Foil" });
        if (options.length) { pricedOwned++; ownedCards.push(...options); }
      } else if ((selectedSet === "All sets" || card.set === selectedSet) && !(hideAlternates && isAlternatePrinting(card)) && !(hideOvernumbered && isOvernumbered(card))) {
        const options: PricedCard[] = [];
        if (quote.standard !== null) options.push({ card, amount: quote.standard, finish: "Standard" });
        if (quote.foil !== null) options.push({ card, amount: quote.foil, finish: "Foil" });
        options.sort((a, b) => b.amount - a.amount);
        if (options[0]) watchCards.push(options[0]);
      }
    }
    ownedCards.sort((a, b) => b.amount - a.amount);
    watchCards.sort((a, b) => b.amount - a.amount);
    return { mostValuable: ownedCards[0] ?? null, watch: watchCards.slice(0, 3), pricedOwned };
  }, [allCards, prices, selectedSet, hideAlternates, hideOvernumbered]);
  const ownedTotal = allCards.filter((card) => card.quantity > 0).length;

  async function chooseFile(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (file.size > 2_000_000) throw new Error("This CSV is too large (2 MB maximum).");
      const csv = await file.text();
      const response = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "preview", csv }) });
      const result = await response.json() as { error?: string; difference: ImportDifference; version: number };
      if (!response.ok) throw new Error(result.error || "The file could not be reviewed.");
      setPreview({ difference: result.difference, version: result.version, filename: file.name, csv });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The file could not be reviewed."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function applyImport() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "apply", csv: preview.csv, filename: preview.filename, version: preview.version }) });
      const result = await response.json() as { error?: string; snapshot: CollectionSnapshot };
      if (!response.ok) throw new Error(result.error || "The collection could not be updated.");
      setSnapshot(result.snapshot as CollectionSnapshot);
      setNotice(`Imported ${result.snapshot.rows.length} rows from ${preview.filename}.`);
      setPreview(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The collection could not be updated."); }
    finally { setBusy(false); }
  }

  return <main className="collection-shell">
    <header className="site-header">
      <div className="brand"><img className="brand-mark" src="/riftbound-logo.png" alt="" /><span>Riftbound <span className="brand-light">Collection</span></span></div>
      <div className="account-area"><span className="account-dot" aria-hidden="true" /><span className="account-name" title={accountName}>{accountName}</span><a href={signOutPath}>Sign out</a></div>
    </header>
    <section className="collection-head">
      <div><p className="eyebrow">MY CARDS</p><h1>My collection</h1><p className="head-note">{snapshot.importedAt ? `Last import ${new Date(snapshot.importedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}` : "Import a Card Nexus export to begin."} · Synced with your ChatGPT account</p></div>
      <div className="head-actions"><a className="secondary-button" href="/api/export">Export CSV</a><button className="primary-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? "Working…" : "Import Card Nexus CSV"}</button><input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Choose a Card Nexus CSV export" onChange={(event) => chooseFile(event.target.files?.[0])} /></div>
    </section>
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && !preview && <p className="error-note" role="alert">{error}</p>}
    <section className="summary-row" aria-label="Collection summary">
      <div className="summary-block"><strong>{formatNumber(overallCopies)}</strong><span>Total copies</span></div>
      <div className="summary-block"><strong>{formatNumber(owned)} <em>/ {formatNumber(setCards.length)}</em></strong><span>{selectedSet === "All sets" ? "Unique printings owned" : `${selectedSet} printings owned`}</span></div>
      <div className="summary-block"><strong>{formatNumber(foils)}</strong><span>Foil copies in {selectedSet === "All sets" ? "collection" : selectedSet}</span></div>
    </section>
    <section className="workspace-grid" aria-label="Cards and collection breakdown">
        <div className="grid-toolbar"><div><h2>Cards</h2><span>{formatNumber(visibleCards.length)} shown · {formatNumber(copies)} copies in {selectedSet === "All sets" ? "all sets" : selectedSet}</span></div><label className="search-box"><span className="visually-hidden">Search cards</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards or number" /></label></div>
        <div className="filters" role="group" aria-label="Card filters"><div className="filter-primary"><label>Set <select value={selectedSet} onChange={(event) => setSelectedSet(event.target.value)}><option>All sets</option>{sets.map((set) => <option key={set}>{set}</option>)}</select></label><div className="segmented" role="group" aria-label="Ownership"><button type="button" aria-pressed={status === "all"} className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>All</button><button type="button" aria-pressed={status === "owned"} className={status === "owned" ? "active" : ""} onClick={() => setStatus("owned")}>Owned</button><button type="button" aria-pressed={status === "missing"} className={status === "missing" ? "active" : ""} onClick={() => setStatus("missing")}>Not owned</button></div></div><div className="filter-exclusions"><label><input type="checkbox" checked={hideAlternates} onChange={(event) => setHideAlternates(event.target.checked)} />Hide alternate art</label><label><input type="checkbox" checked={hideOvernumbered} onChange={(event) => setHideOvernumbered(event.target.checked)} />Hide over-numbered</label></div></div>
        {visibleCards.length ? <div className="card-grid" aria-label="Cards">{visibleCards.map((card) => <CardTile key={card.code} card={card} onOpen={setSelectedCard} />)}</div> : <div className="empty-state">No cards match these filters.</div>}
      <aside className="insights-panel" aria-label="Collection breakdown">
        <div className="insight-section"><h3>By set</h3><p>Unique printings owned</p>{setSummary.map(({ set, owned, total }) => <button type="button" className={`stat-row ${selectedSet === set ? "selected" : ""}`} key={set} onClick={() => setSelectedSet(set)}><span className="stat-title">{set}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></button>)}</div>
        <div className="insight-section"><h3>By color</h3><p>Unique printings in {selectedSet === "All sets" ? "all sets" : selectedSet}</p>{colorSummary.map(({ color, owned, total }) => <div className="stat-row passive" key={color}><span className="stat-title">{color}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></div>)}</div>
        <div className="insight-section price-insight"><h3>Card values</h3>{prices ? <><p>Cardmarket 7-day sale averages · EUR · {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p><h4>Most valuable priced card</h4>{priceHighlights.mostValuable ? <button type="button" className="price-card-row" onClick={() => setSelectedCard(priceHighlights.mostValuable!.card)}><span>{priceHighlights.mostValuable.card.name}<small>{priceHighlights.mostValuable.card.set} · {priceHighlights.mostValuable.finish}</small></span><strong>{formatPrice(priceHighlights.mostValuable.amount)}</strong></button> : <p>No owned cards have a 7-day average yet.</p>}<p className="price-coverage">{priceHighlights.pricedOwned} of {ownedTotal} owned printings priced</p><h4>Unowned cards to watch</h4>{priceHighlights.watch.length ? priceHighlights.watch.map((item) => <button type="button" className="price-card-row" key={`${item.card.code}-${item.finish}`} onClick={() => setSelectedCard(item.card)}><span>{item.card.name}<small>{item.card.number.toUpperCase()} · {item.finish}</small></span><strong>{formatPrice(item.amount)}</strong></button>) : <p>No matched 7-day prices in this set.</p>}</> : <p>{priceError || "Loading recent prices…"}</p>}<p className="price-source"><a href="https://www.cardmarket.com/en/Riftbound/Data/Price-Guide" target="_blank" rel="noreferrer">Cardmarket price guide</a> · Estimates vary by condition and language.</p></div>
        <p className="credit">Card images and names © Riot Games. Card catalog via <a href="https://github.com/LouisCourrian/riftbound-cards" target="_blank" rel="noreferrer">riftbound-cards</a>.</p>
      </aside>
    </section>
    <Dialog open={selectedCard !== null} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
      {selectedCard && <DialogContent className="card-detail-dialog"><div className="card-detail-art">{selectedCard.image ? <img src={selectedCard.image} alt={`${selectedCard.name} card`} /> : <span>Image unavailable</span>}</div><div className="card-detail-copy"><p className="eyebrow">{selectedCard.set} · {selectedCard.number.toUpperCase()}</p><DialogTitle className="card-detail-title">{selectedCard.name}</DialogTitle><DialogDescription className="card-detail-description">{selectedCard.quantity === 0 ? "Not owned" : `${formatNumber(selectedCard.quantity)} ${selectedCard.quantity === 1 ? "copy" : "copies"} owned`}</DialogDescription><div className="card-detail-prices"><h3>7-day average sale price</h3>{quoteFor(selectedCard, prices) ? <>{quoteFor(selectedCard, prices)?.standard != null && <div><span>Standard</span><strong>{formatPrice(quoteFor(selectedCard, prices)!.standard!)}</strong></div>}{quoteFor(selectedCard, prices)?.foil != null && <div><span>Foil</span><strong>{formatPrice(quoteFor(selectedCard, prices)!.foil!)}</strong></div>}</> : <p>{prices ? "No reliable price match for this printing." : priceError || "Loading recent prices…"}</p>}<p>Cardmarket · EUR · {prices ? new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : ""}</p></div></div></DialogContent>}
    </Dialog>
    {preview && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPreview(null); }}><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="dialog-top"><div><p className="eyebrow">CARD NEXUS IMPORT</p><h2 id="import-title">Review this export</h2><p>{preview.filename}</p></div><button className="close-button" type="button" aria-label="Close import review" onClick={() => setPreview(null)} disabled={busy}>×</button></div><div className="dialog-summary"><div><strong>{preview.difference.incomingRows}</strong><span>rows in file</span></div><div><strong>{preview.difference.newCards.length}</strong><span>new cards</span></div><div><strong>{preview.difference.newFoils.length}</strong><span>foil additions</span></div></div><div className="dialog-scroll"><DifferenceList title="Cards you did not own" items={preview.difference.newCards} /><DifferenceList title="New foil copies" items={preview.difference.newFoils} /><DifferenceList title="More standard copies" items={preview.difference.moreCopies} />{preview.difference.removedCopies > 0 && <p className="removal-note">This export removes or changes the finish of {preview.difference.removedCopies} previously recorded copies.</p>}{preview.difference.newCards.length + preview.difference.newFoils.length + preview.difference.moreCopies.length === 0 && preview.difference.removedCopies === 0 && <p className="no-changes">No quantity changes found. You can still save this export as your latest snapshot.</p>}</div>{error && <p className="error-note" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setPreview(null)} disabled={busy}>Cancel</button><button className="primary-button" type="button" onClick={applyImport} disabled={busy}>{busy ? "Saving…" : "Save this collection"}</button></div><p className="dialog-help">This replaces the previous Card Nexus snapshot. Importing the same file again will not add copies twice.</p></section></div>}
  </main>;
}

function CardTile({ card, onOpen }: { card: DisplayCard; onOpen: (card: DisplayCard) => void }) {
  const shiny = hasFoilTreatment(card);
  return <article className="card-tile"><button type="button" className="card-open" onClick={() => onOpen(card)} aria-label={`View ${card.name} larger, ${card.quantity} owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}`}><div className={`card-image-wrap ${card.quantity ? "" : "missing"}`}>
    {card.image ? <img src={card.image} alt="" loading="lazy" /> : <span className="no-image">Image unavailable</span>}
    <span className={`quantity-badge${shiny ? " shiny" : ""}`}>{card.quantity}</span>
  </div><div className="card-meta"><span className="card-number">{card.number.toUpperCase()}</span><strong title={card.name}>{card.name}</strong></div><p className="card-set">{card.set}</p></button></article>;
}

function DifferenceList({ title, items }: { title: string; items: ImportDifference["newCards"] }) {
  if (!items.length) return null;
  return <section className="difference-list"><h3>{title} <span>{items.length}</span></h3>{items.slice(0, 8).map((item, index) => <div className="difference-row" key={`${item.expansion}-${item.printNumber}-${index}`}><span>{item.name}<small>{item.expansion} · {item.printNumber}</small></span><b>+{item.quantity}</b></div>)}{items.length > 8 && <p>And {items.length - 8} more cards</p>}</section>;
}
