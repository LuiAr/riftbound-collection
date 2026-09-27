"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { catalog, displayCards, hasFoilTreatment, isAlternatePrinting, isOvernumbered, type DisplayCard, type ImportDifference } from "../lib/collection";
import { matchesCardType, rarityFor, type RarityKind } from "../lib/rarity";
import { oneOfEachGoal } from "../lib/goals";
import { isRadianceCatalogComplete } from "../lib/radiance";
import { priceKey, type PriceQuote, type PriceSnapshot } from "../lib/prices";
import type { CollectionSnapshot, CollectionVersion } from "../lib/server-collection";
import SingleFilter from "../components/single-filter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import DeckMatcher from "./deck-matcher";
import HistoryCompare from "./history-compare";

type Props = { initial: CollectionSnapshot; initialHistory: CollectionVersion[]; accountName: string; signOutPath: string };
type Preview = { difference: ImportDifference; version: number; filename: string; csv: string };
const radianceReady = isRadianceCatalogComplete(catalog);
const sets = ["Vendetta", "Vendetta Promos", "Unleashed", "Origins", "Spiritforged", "Proving Grounds", ...(radianceReady ? ["Radiance"] : [])];
const setOptions = ["All sets", ...sets].map((set) => ({ value: set, label: set }));
const ownershipOptions = [{ value: "all", label: "All cards" }, { value: "owned", label: "Owned" }, { value: "missing", label: "Missing" }];
const colors = ["Fury", "Calm", "Mind", "Body", "Order", "Chaos", "Colorless"];
const rarityOptions: { kind: RarityKind; label: string }[] = [
  { kind: "common", label: "Common" },
  { kind: "uncommon", label: "Uncommon" },
  { kind: "rare", label: "Rare" },
  { kind: "epic", label: "Epic" },
  { kind: "special", label: "Over-numbered / alternate art" },
];
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatPrice = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);
type PricedCard = { card: DisplayCard; amount: number; finish: "Standard" | "Foil" };

function quoteFor(card: DisplayCard, prices: PriceSnapshot | null): PriceQuote | null {
  if (card.extra || isAlternatePrinting(card) || isOvernumbered(card) || card.rarity === "Showcase") return null;
  return prices?.quotes[priceKey(card.set, card.name)] ?? null;
}

function estimateFor(quote: PriceQuote | null): string | null {
  if (!quote) return null;
  const amounts = [quote.standard, quote.foil].filter((amount): amount is number => amount !== null);
  if (!amounts.length) return null;
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? formatPrice(low) : `${formatPrice(low)}–${formatPrice(high)}`;
}

export default function CollectionClient({ initial, initialHistory, accountName, signOutPath }: Props) {
  const [currentSnapshot, setCurrentSnapshot] = useState(initial);
  const [viewedSnapshot, setViewedSnapshot] = useState<CollectionSnapshot | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [section, setSection] = useState<"collection" | "decks" | "history">("collection");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const snapshot = viewedSnapshot ?? currentSnapshot;
  const [selectedSet, setSelectedSet] = useState("Vendetta");
  const [status, setStatus] = useState("all");
  const [selectedRarities, setSelectedRarities] = useState<RarityKind[]>([]);
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

  const allCards = useMemo(() => displayCards(snapshot.rows).filter((card) => radianceReady || card.set !== "Radiance"), [snapshot.rows]);
  const latestCards = useMemo(() => displayCards(currentSnapshot.rows).filter((card) => radianceReady || card.set !== "Radiance"), [currentSnapshot.rows]);
  const setCards = useMemo(() => allCards.filter((card) => selectedSet === "All sets" || card.set === selectedSet), [allCards, selectedSet]);
  const visibleCards = useMemo(() => setCards.filter((card) => {
    if (status === "owned" && card.quantity === 0) return false;
    if (status === "missing" && card.quantity > 0) return false;
    if (!matchesCardType(card, selectedRarities)) return false;
    const query = search.trim().toLowerCase();
    return !query || `${card.name} ${card.number} ${card.set}`.toLowerCase().includes(query);
  }).sort((a, b) => a.set.localeCompare(b.set) || a.number.localeCompare(b.number, undefined, { numeric: true }) || a.code.localeCompare(b.code)), [setCards, status, selectedRarities, search]);
  const owned = setCards.filter((card) => card.quantity > 0).length;
  const copies = setCards.reduce((sum, card) => sum + card.quantity, 0);
  const foils = setCards.reduce((sum, card) => sum + card.foilQuantity, 0);
  const overallCopies = allCards.reduce((sum, card) => sum + card.quantity, 0);
  const goal = useMemo(() => oneOfEachGoal(allCards, selectedSet), [allCards, selectedSet]);
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
      } else if ((selectedSet === "All sets" || card.set === selectedSet) && matchesCardType(card, selectedRarities)) {
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
  }, [allCards, prices, selectedSet, selectedRarities]);
  const ownedTotal = allCards.filter((card) => card.quantity > 0).length;
  const selectedQuote = selectedCard ? quoteFor(selectedCard, prices) : null;
  const selectedEstimate = estimateFor(selectedQuote);
  const selectedRarity = selectedCard ? rarityFor(selectedCard) : null;

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
      setCurrentSnapshot(result.snapshot);
      setViewedSnapshot(null);
      if (result.snapshot.importId && result.snapshot.importedAt) setHistory((old) => [{ importId: result.snapshot.importId!, version: result.snapshot.version, importedAt: result.snapshot.importedAt!, sourceName: result.snapshot.sourceName ?? preview.filename }, ...old]);
      setNotice(`Imported ${result.snapshot.rows.length} rows from ${preview.filename}.`);
      setPreview(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The collection could not be updated."); }
    finally { setBusy(false); }
  }

  async function viewVersion(importId: string) {
    setHistoryError("");
    if (importId === currentSnapshot.importId) {
      setViewedSnapshot(null);
      setSection("collection");
      return;
    }
    setHistoryBusy(true);
    try {
      const response = await fetch(`/api/history?importId=${encodeURIComponent(importId)}`, { cache: "no-store" });
      const result = await response.json() as { error?: string; snapshot?: CollectionSnapshot };
      if (!response.ok || !result.snapshot) throw new Error(result.error || "This version could not be loaded.");
      setViewedSnapshot(result.snapshot);
      setSection("collection");
    } catch (cause) { setHistoryError(cause instanceof Error ? cause.message : "This version could not be loaded."); }
    finally { setHistoryBusy(false); }
  }

  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand"><img className="brand-mark" src="/riftbound-logo.png" alt="" /><span>Riftbound<span className="brand-slash" aria-hidden="true">/</span><span className="brand-light"><span className="visually-hidden"> </span>Collection</span></span></div>
        <nav className="section-nav" aria-label="Website sections">
          <button type="button" className={section === "collection" ? "active" : ""} aria-current={section === "collection" ? "page" : undefined} onClick={() => setSection("collection")}>My collection</button>
          <button type="button" className={section === "decks" ? "active" : ""} aria-current={section === "decks" ? "page" : undefined} onClick={() => setSection("decks")}>Deck matcher</button>
          <button type="button" className={section === "history" ? "active" : ""} aria-current={section === "history" ? "page" : undefined} onClick={() => setSection("history")}>History</button>
        </nav>
        <div className="account-area"><span className="account-name" title={accountName}>{accountName}</span><a href={signOutPath}>Sign out</a></div>
      </div>
    </header>
    <main className="collection-shell">
    {section === "history" && <section className="feature-page" aria-labelledby="history-title">
      <p className="eyebrow">YOUR PROFILE</p><h1 id="history-title">Collection history</h1>
      <p className="feature-intro">Every saved Card Nexus import appears here. Open a version to browse its cards and summaries without changing your latest collection.</p>
      <HistoryCompare key={currentSnapshot.importId ?? "empty"} history={history} latest={currentSnapshot} />
      {historyError && <p className="error-note" role="alert">{historyError}</p>}
      {history.length ? <div className="history-list">{history.map((item) => <button type="button" className={`history-item ${snapshot.importId === item.importId ? "selected" : ""}`} key={item.importId} disabled={historyBusy} onClick={() => viewVersion(item.importId)}><span><strong>{item.sourceName}</strong><small>{new Date(item.importedAt).toLocaleString("en-US", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</small></span><span className="history-item-side">{item.importId === currentSnapshot.importId ? "Latest" : `Version ${item.version}`}<span aria-hidden="true">→</span></span></button>)}</div> : <div className="empty-state">Import a Card Nexus CSV to create your first collection version.</div>}
    </section>}
    {section === "decks" && <DeckMatcher cards={latestCards} />}
    {section === "collection" && <>
    <section className="collection-head">
      <div><p className="eyebrow">MY CARDS</p><h1>My collection</h1><p className="head-note">{snapshot.importedAt ? `${viewedSnapshot ? "Imported" : "Last import"} ${new Date(snapshot.importedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}` : "Import a Card Nexus export to begin."} · Synced with your ChatGPT account</p></div>
      {!viewedSnapshot && <div className="head-actions"><a className="secondary-button" href="/api/export">Export CSV</a><button className="primary-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? "Working…" : "Import Card Nexus CSV"}</button><input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Choose a Card Nexus CSV export" onChange={(event) => chooseFile(event.target.files?.[0])} /></div>}
    </section>
    {viewedSnapshot && <div className="history-banner"><span>Viewing version {viewedSnapshot.version} from {new Date(viewedSnapshot.importedAt!).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. Your latest collection is unchanged.</span><button type="button" onClick={() => setViewedSnapshot(null)}>Return to latest</button></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && !preview && <p className="error-note" role="alert">{error}</p>}
    <section className="summary-row" aria-label="Collection summary">
      <div className="summary-block"><strong>{formatNumber(overallCopies)}</strong><span>Total copies</span></div>
      <div className="summary-block"><strong>{formatNumber(owned)} <em>/ {formatNumber(setCards.length)}</em></strong><span>{selectedSet === "All sets" ? "Unique printings owned" : `${selectedSet} printings owned`}</span></div>
      <div className="summary-block accent"><strong>{formatNumber(foils)}</strong><span>Foil copies in {selectedSet === "All sets" ? "collection" : selectedSet}</span></div>
    </section>
    <section className="workspace-grid" aria-label="Cards and collection breakdown">
        <div className="grid-toolbar"><div><h2>Cards</h2><span>{formatNumber(visibleCards.length)} shown · {formatNumber(copies)} copies in {selectedSet === "All sets" ? "all sets" : selectedSet}</span></div><label className="search-box"><span className="visually-hidden">Search cards</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards or number" /></label></div>
        <div className="filters" role="group" aria-label="Card filters">
          <div className="filter-fields">
            <SingleFilter label="Set" value={selectedSet} options={setOptions} onChange={setSelectedSet} />
            <SingleFilter label="Ownership" value={status} options={ownershipOptions} onChange={setStatus} />
            <div className="filter-field rarity-filter-field"><span id="rarity-filter-label">Rarity &amp; printing</span><DropdownMenu><DropdownMenuTrigger aria-labelledby="rarity-filter-label rarity-filter-value" className="filter-trigger"><span id="rarity-filter-value">{selectedRarities.length === 0 ? "All rarities" : selectedRarities.length === 1 ? rarityOptions.find((option) => option.kind === selectedRarities[0])?.label : `${selectedRarities.length} rarities selected`}</span></DropdownMenuTrigger><DropdownMenuContent align="start" className="filter-menu"><DropdownMenuItem onSelect={() => setSelectedRarities([])}>All rarities</DropdownMenuItem><DropdownMenuSeparator />{rarityOptions.map(({ kind, label }) => <DropdownMenuCheckboxItem key={kind} checked={selectedRarities.includes(kind)} onCheckedChange={(checked) => setSelectedRarities((current) => checked ? [...current, kind] : current.filter((item) => item !== kind))} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu></div>
          </div>
        </div>
        {visibleCards.length ? <div className="card-grid" aria-label="Cards">{visibleCards.map((card) => <CardTile key={card.code} card={card} onOpen={setSelectedCard} />)}</div> : <div className="empty-state">No cards match these filters.</div>}
      <aside className="insights-panel" aria-label="Collection breakdown">
        {goal.total > 0 && <div className="insight-section goal-insight"><h3>One of each</h3><p>Regular Common, Uncommon, and Rare cards · no Epic, alternate art, or over-numbered printings</p><div className="goal-body"><div className="goal-ring" style={{ "--progress": `${100 * goal.owned / goal.total}%` } as CSSProperties} aria-hidden="true"><span>{Math.floor(100 * goal.owned / goal.total)}%</span></div><div className="goal-total"><strong>{goal.owned} / {goal.total}</strong><span>{goal.total - goal.owned} missing</span></div></div>{goal.missing.length > 0 && <details className="goal-missing"><summary>See missing cards</summary><ul>{goal.missing.map((card) => <li key={card.code}>{card.name}<small>{card.set} · {card.number}</small></li>)}</ul></details>}</div>}
        <div className="insight-section"><h3>By set</h3><p>Unique printings owned</p>{setSummary.map(({ set, owned, total }) => <button type="button" className={`stat-row ${selectedSet === set ? "selected" : ""}`} key={set} onClick={() => setSelectedSet(set)}><span className="stat-title">{set}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></button>)}</div>
        <div className="insight-section"><h3>By domain</h3><p>Unique printings in {selectedSet === "All sets" ? "all sets" : selectedSet}</p>{colorSummary.map(({ color, owned, total }) => <div className={`stat-row passive domain-${color.toLowerCase()}`} key={color}><span className="stat-title">{color}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></div>)}</div>
        <div className="insight-section price-insight"><h3>Card values</h3>{prices ? <><p>Cardmarket 7-day sale averages · EUR · {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p><h4>Most valuable priced card</h4>{priceHighlights.mostValuable ? <button type="button" className="price-card-row" onClick={() => setSelectedCard(priceHighlights.mostValuable!.card)}><span>{priceHighlights.mostValuable.card.name}<small>{priceHighlights.mostValuable.card.set} · {priceHighlights.mostValuable.finish}</small></span><strong>{formatPrice(priceHighlights.mostValuable.amount)}</strong></button> : <p>No owned cards have a 7-day average yet.</p>}<p className="price-coverage">{priceHighlights.pricedOwned} of {ownedTotal} owned printings priced</p><h4>Unowned cards to watch</h4>{priceHighlights.watch.length ? priceHighlights.watch.map((item) => <button type="button" className="price-card-row" key={`${item.card.code}-${item.finish}`} onClick={() => setSelectedCard(item.card)}><span>{item.card.name}<small>{item.card.number.toUpperCase()} · {item.finish}</small></span><strong>{formatPrice(item.amount)}</strong></button>) : <p>No matched 7-day prices in this set.</p>}</> : <p>{priceError || "Loading recent prices…"}</p>}<p className="price-source"><a href="https://www.cardmarket.com/en/Riftbound/Data/Price-Guide" target="_blank" rel="noreferrer">Cardmarket price guide</a> · Estimates vary by condition and language.</p></div>
        <p className="credit">Card images and names © Riot Games. Card catalog via <a href="https://github.com/LouisCourrian/riftbound-cards" target="_blank" rel="noreferrer">riftbound-cards</a>.</p>
      </aside>
    </section>
    </>}
    <Dialog open={selectedCard !== null} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
      {selectedCard && <DialogContent className="card-detail-dialog">
        <div className="card-detail-art">{selectedCard.image ? <img src={selectedCard.image} alt={`${selectedCard.name} card`} /> : <span>Image unavailable</span>}</div>
        <div className="card-detail-copy">
          <p className="eyebrow">{selectedCard.set} · {selectedCard.number.toUpperCase()}</p>
          <DialogTitle className="card-detail-title">{selectedCard.name}</DialogTitle>
          <div className="card-detail-facts">{selectedCard.domains.map((domain) => <span className={`domain-chip domain-${domain.toLowerCase()}`} key={domain}>{domain}</span>)}{selectedRarity && <span className={`card-rarity-label rarity-${selectedRarity.kind}`}>{selectedRarity.label}</span>}<span className="owned-chip">{selectedCard.quantity === 0 ? "Not owned" : `${formatNumber(selectedCard.quantity)} ${selectedCard.quantity === 1 ? "copy" : "copies"} owned${selectedCard.foilQuantity ? ` · ${formatNumber(selectedCard.foilQuantity)} foil` : ""}`}</span></div>
          <DialogDescription className="visually-hidden">Card details and estimated price</DialogDescription>
          <div className="card-detail-prices">
            <p className="estimate-label">Estimated price per card</p>
            {selectedEstimate ? <strong className="estimate-value">{selectedEstimate}</strong> : <p className="estimate-unavailable">{prices ? "No reliable price estimate for this printing." : priceError || "Loading recent prices…"}</p>}
            {selectedQuote?.standard != null && <div className="finish-price"><span>Standard</span><strong>{formatPrice(selectedQuote.standard)}</strong></div>}
            {selectedQuote?.foil != null && <div className="finish-price"><span>Foil</span><strong>{formatPrice(selectedQuote.foil)}</strong></div>}
            {prices && <p className="price-method">Cardmarket 7-day sale average · EUR · {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}. Varies by condition and language.</p>}
          </div>
        </div>
      </DialogContent>}
    </Dialog>
    {preview && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPreview(null); }}><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="dialog-top"><div><p className="eyebrow">CARD NEXUS IMPORT</p><h2 id="import-title">Review this export</h2><p>{preview.filename}</p></div><button className="close-button" type="button" aria-label="Close import review" onClick={() => setPreview(null)} disabled={busy}>×</button></div><div className="dialog-summary"><div><strong>{preview.difference.incomingRows}</strong><span>rows in file</span></div><div><strong>{preview.difference.newCards.length}</strong><span>new cards</span></div><div><strong>{preview.difference.newFoils.length}</strong><span>foil additions</span></div></div><div className="dialog-scroll"><DifferenceList title="Cards you did not own" items={preview.difference.newCards} /><DifferenceList title="New foil copies" items={preview.difference.newFoils} /><DifferenceList title="More standard copies" items={preview.difference.moreCopies} />{preview.difference.removedCopies > 0 && <p className="removal-note">This export removes or changes the finish of {preview.difference.removedCopies} previously recorded copies.</p>}{preview.difference.newCards.length + preview.difference.newFoils.length + preview.difference.moreCopies.length === 0 && preview.difference.removedCopies === 0 && <p className="no-changes">No quantity changes found. You can still save this export as your latest snapshot.</p>}</div>{error && <p className="error-note" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setPreview(null)} disabled={busy}>Cancel</button><button className="primary-button" type="button" onClick={applyImport} disabled={busy}>{busy ? "Saving…" : "Save this collection"}</button></div><p className="dialog-help">Saving makes this the latest collection. Earlier imports remain in History. Importing the same file again will not add copies twice.</p></section></div>}
    </main>
  </>;
}

function CardTile({ card, onOpen }: { card: DisplayCard; onOpen: (card: DisplayCard) => void }) {
  const shiny = hasFoilTreatment(card);
  const rarity = rarityFor(card);
  return <article className="card-tile"><button type="button" className="card-open" onClick={() => onOpen(card)} aria-label={`View ${card.name} larger, ${rarity?.label ?? card.rarity}, ${card.quantity} owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}`}><div className={`card-frame${shiny ? " shiny" : ""}${card.quantity ? "" : " missing"}`}><div className={`card-image-wrap ${card.quantity ? "" : "missing"}`}>
    {card.image ? <img src={card.image} alt="" loading="lazy" /> : <span className="no-image">Image unavailable</span>}
    <span className={`quantity-badge${shiny ? " shiny" : ""}`}>×{card.quantity}</span>
  </div></div><span className="card-domains" aria-hidden="true">{card.domains.map((domain) => <span className={`domain-${domain.toLowerCase()}`} key={domain} />)}</span><div className="card-meta"><span className="card-number">{card.number.toUpperCase()}</span><span className={`card-rarity rarity-${rarity?.kind ?? "other"}`}>{card.rarity}</span></div><strong className="card-name" title={card.name}>{card.name}</strong><p className="card-set">{card.set}</p></button></article>;
}

function DifferenceList({ title, items }: { title: string; items: ImportDifference["newCards"] }) {
  if (!items.length) return null;
  return <section className="difference-list"><h3>{title} <span>{items.length}</span></h3>{items.slice(0, 8).map((item, index) => <div className="difference-row" key={`${item.expansion}-${item.printNumber}-${index}`}><span>{item.name}<small>{item.expansion} · {item.printNumber}</small></span><b>+{item.quantity}</b></div>)}{items.length > 8 && <p>And {items.length - 8} more cards</p>}</section>;
}
