"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, Download, Search, Upload } from "lucide-react";
import { catalog, displayCards, hasFoilTreatment, isAlternatePrinting, isOvernumbered, type DisplayCard, type ImportDifference } from "../lib/collection";
import { matchesCardType, rarityFor, type RarityKind } from "../lib/rarity";
import { oneOfEachGoal } from "../lib/goals";
import { isRadianceCatalogComplete } from "../lib/radiance";
import { priceKey, type PriceQuote, type PriceSnapshot } from "../lib/prices";
import { deckCardKey, deckCardName, deckCopyGoals, deckCopyLimit, type DeckCopyGoal } from "../lib/deck-copy-limit";
import type { CollectionSnapshot, CollectionVersion } from "../lib/server-collection";
import SingleFilter from "../components/single-filter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import DeckMatcher from "./deck-matcher";
import HistoryCompare from "./history-compare";

type Props = { initial: CollectionSnapshot; initialHistory: CollectionVersion[]; accountName: string; signOutPath: string };
type Preview = { difference: ImportDifference; version: number; filename: string; csv: string };
const radianceReady = isRadianceCatalogComplete(catalog);
const sets = ["Vendetta", "Unleashed", "Origins", "Spiritforged", "Proving Grounds", ...(radianceReady ? ["Radiance"] : [])];
const setOptions = ["All sets", ...sets].map((set) => ({ value: set, label: set }));
const ownershipOptions: { value: Ownership; label: string }[] = [{ value: "all", label: "All cards" }, { value: "owned", label: "Owned" }, { value: "missing", label: "Missing" }, { value: "needs", label: "Need copies" }];
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
type Ownership = "all" | "owned" | "missing" | "needs";

function preferredPrinting(card: DisplayCard): number {
  if (card.extra) return 2;
  if (isAlternatePrinting(card) || isOvernumbered(card) || card.rarity === "Showcase") return 1;
  return 0;
}
const ratio = (part: number, whole: number) => whole > 0 ? part / whole : 0;
const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

function importSummary(difference: ImportDifference): string {
  const parts = [
    difference.newCards.length ? plural(difference.newCards.length, "new card", "new cards") : "",
    difference.newFoils.length ? plural(difference.newFoils.length, "new foil", "new foils") : "",
    difference.moreCopies.length ? `${plural(difference.moreCopies.length, "card", "cards")} with more copies` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "no quantity changes";
}

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
  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`;
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
  const [status, setStatus] = useState<Ownership>("all");
  const [overviewOpen, setOverviewOpen] = useState(false);
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
  const importTrigger = useRef<HTMLButtonElement>(null);

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
  const deckGoals = useMemo(() => deckCopyGoals(allCards), [allCards]);
  const setCards = useMemo(() => allCards.filter((card) => selectedSet === "All sets" || card.set === selectedSet), [allCards, selectedSet]);
  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return setCards.filter((card) => matchesCardType(card, selectedRarities) && (!query || `${deckCardName(card)} ${card.number} ${card.set}`.toLowerCase().includes(query)));
  }, [setCards, selectedRarities, search]);
  const cardsNeedingCopies = useMemo(() => {
    const byName = new Map<string, DisplayCard>();
    for (const card of filteredCards) {
      const key = deckCardKey(card);
      if (!deckGoals.get(key)?.missing) continue;
      const previous = byName.get(key);
      if (!previous || preferredPrinting(card) < preferredPrinting(previous)) byName.set(key, card);
    }
    return [...byName.values()];
  }, [filteredCards, deckGoals]);
  const ownershipCounts: Record<Ownership, number> = {
    all: filteredCards.length,
    owned: filteredCards.filter((card) => card.quantity > 0).length,
    missing: filteredCards.filter((card) => card.quantity === 0).length,
    needs: cardsNeedingCopies.length,
  };
  const visibleCards = useMemo(() => (status === "needs" ? cardsNeedingCopies : filteredCards.filter((card) => status === "all" || (status === "owned" ? card.quantity > 0 : card.quantity === 0)))
    .sort((a, b) => a.set.localeCompare(b.set) || a.number.localeCompare(b.number, undefined, { numeric: true }) || a.code.localeCompare(b.code)), [filteredCards, cardsNeedingCopies, status]);
  const owned = setCards.filter((card) => card.quantity > 0).length;
  const copies = setCards.reduce((sum, card) => sum + card.quantity, 0);
  const foils = setCards.reduce((sum, card) => sum + card.foilQuantity, 0);
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
  const selectedDeckGoal = selectedCard ? deckGoals.get(deckCardKey(selectedCard)) : null;

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
      setNotice(`Saved ${preview.filename}: ${importSummary(preview.difference)}.`);
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

  const firstRun = !snapshot.importedAt && !viewedSnapshot;
  const setLabel = selectedSet === "All sets" ? "all sets" : selectedSet;
  const ownershipIndex = ownershipOptions.findIndex((option) => option.value === status);
  const openFilePicker = () => fileInput.current?.click();
  const importButton = <button ref={importTrigger} className="primary-button" type="button" onClick={openFilePicker} disabled={busy} aria-busy={busy}><Upload aria-hidden="true" />{busy ? "Working…" : "Import Card Nexus CSV"}</button>;

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand"><img className="brand-mark" src="/riftbound-logo-96.png" alt="" width="32" height="32" /><span>Riftbound<span className="brand-slash" aria-hidden="true">/</span><span className="brand-light"><span className="visually-hidden"> </span>Collection</span></span></div>
        <nav className="section-nav" aria-label="Website sections">
          <button type="button" className={section === "collection" ? "active" : ""} aria-current={section === "collection" ? "page" : undefined} onClick={() => setSection("collection")}>My collection</button>
          <button type="button" className={section === "decks" ? "active" : ""} aria-current={section === "decks" ? "page" : undefined} onClick={() => setSection("decks")}>Deck matcher</button>
          <button type="button" className={section === "history" ? "active" : ""} aria-current={section === "history" ? "page" : undefined} onClick={() => setSection("history")}>History</button>
        </nav>
        <div className="account-area"><span className="account-name" title={accountName}>{accountName}</span><a href={signOutPath}>Sign out</a></div>
      </div>
    </header>
    <main className="collection-shell" id="main-content" tabIndex={-1}>
    {section === "history" && <section className="feature-page view" aria-labelledby="history-title">
      <h1 id="history-title">Collection history</h1>
      <p className="feature-intro">Every saved Card Nexus import appears here. Open a version to browse its cards and summaries without changing your latest collection.</p>
      <HistoryCompare key={currentSnapshot.importId ?? "empty"} history={history} latest={currentSnapshot} />
      {historyError && <p className="error-note" role="alert">{historyError}</p>}
      {history.length ? <div className="history-list">{history.map((item) => <button type="button" className={`history-item ${snapshot.importId === item.importId ? "selected" : ""}`} key={item.importId} disabled={historyBusy} onClick={() => viewVersion(item.importId)}><span><strong>{item.sourceName}</strong><small>{new Date(item.importedAt).toLocaleString("en-US", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</small></span><span className="history-item-side">{item.importId === currentSnapshot.importId ? "Latest" : `Version ${item.version}`}<ArrowRight aria-hidden="true" /></span></button>)}</div> : <div className="empty-state">Import a Card Nexus CSV to create your first collection version.</div>}
    </section>}
    {section === "decks" && <DeckMatcher cards={latestCards} />}
    {section === "collection" && <div className="view">
    <section className="page-head">
      <div><h1>My collection</h1><p className="head-note">{snapshot.importedAt ? `${viewedSnapshot ? "Imported" : "Last import"} ${new Date(snapshot.importedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} · ` : ""}Synced with your ChatGPT account</p></div>
      {!viewedSnapshot && !firstRun && <div className="head-actions"><a className="secondary-button" href="/api/export"><Download aria-hidden="true" />Export CSV</a>{importButton}</div>}
      {!viewedSnapshot && <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Choose a Card Nexus CSV export" onChange={(event) => chooseFile(event.target.files?.[0])} />}
    </section>
    {viewedSnapshot && <div className="history-banner"><span>Viewing version {viewedSnapshot.version} from {new Date(viewedSnapshot.importedAt!).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. Your latest collection is unchanged.</span><button type="button" onClick={() => setViewedSnapshot(null)}>Return to latest</button></div>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {error && !preview && <p className="error-note" role="alert">{error}</p>}
    <div className="workspace-grid">
      {firstRun ? <section className="welcome-panel panel" aria-labelledby="welcome-title">
        <img src="/riftbound-logo-96.png" alt="" width="52" height="52" />
        <div><h2 id="welcome-title">Start with your Card Nexus export</h2><p>Export your collection from the Card Nexus app as a CSV file, then import it here to see every card you own and every card you are still missing.</p></div>
        {importButton}
      </section> : <section className="set-progress panel" aria-labelledby="progress-title">
        <h2 id="progress-title">{selectedSet}</h2>
        <div className="set-progress-top"><p className="set-progress-count"><strong>{formatNumber(owned)}</strong><span>of {formatNumber(setCards.length)} printings owned</span></p><span className="set-progress-percent">{Math.floor(100 * ratio(owned, setCards.length))}%</span></div>
        <div className="progress-bar" role="progressbar" aria-label={`${selectedSet} printings owned`} aria-valuemin={0} aria-valuemax={setCards.length} aria-valuenow={owned}><span style={{ "--progress": ratio(owned, setCards.length) } as CSSProperties} /></div>
        <ul className="set-progress-meta"><li><strong>{formatNumber(copies)}</strong> {copies === 1 ? "copy" : "copies"} in {setLabel}</li><li><strong>{formatNumber(foils)}</strong> foil {foils === 1 ? "copy" : "copies"}</li></ul>
      </section>}
      <div className="card-toolbar">
        <h2 className="visually-hidden">Cards</h2>
        <div className="toolbar-top">
          <div className="ownership-toggle" role="group" aria-label="Ownership" style={{ "--index": ownershipIndex } as CSSProperties}>{ownershipOptions.map((option) => <button type="button" key={option.value} aria-pressed={status === option.value} onClick={() => setStatus(option.value)}>{option.label}<span>{formatNumber(ownershipCounts[option.value])}</span></button>)}</div>
          <span className="result-count">{plural(visibleCards.length, "card", "cards")} shown</span>
        </div>
        <div className="filter-fields" role="group" aria-label="Card filters">
          <label className="filter-field search-field"><span>Search</span><span className="search-box"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards or number" /></span></label>
          <SingleFilter label="Set" value={selectedSet} options={setOptions} onChange={setSelectedSet} />
          <div className="filter-field rarity-filter-field"><span id="rarity-filter-label">Rarity &amp; printing</span><DropdownMenu><DropdownMenuTrigger aria-labelledby="rarity-filter-label rarity-filter-value" className="filter-trigger"><span id="rarity-filter-value">{selectedRarities.length === 0 ? "All rarities" : selectedRarities.length === 1 ? rarityOptions.find((option) => option.kind === selectedRarities[0])?.label : `${selectedRarities.length} rarities selected`}</span><ChevronDown aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="start" className="filter-menu"><DropdownMenuItem onSelect={() => setSelectedRarities([])}>All rarities</DropdownMenuItem><DropdownMenuSeparator />{rarityOptions.map(({ kind, label }) => <DropdownMenuCheckboxItem key={kind} checked={selectedRarities.includes(kind)} onCheckedChange={(checked) => setSelectedRarities((current) => checked ? [...current, kind] : current.filter((item) => item !== kind))} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu></div>
        </div>
        {status === "needs" && <p className="filter-note">Need copies to reach the deck limit: 3 per main-deck card, 1 per Legend or Battlefield. All printings count together; runes and tokens are excluded.</p>}
      </div>
      <aside className={`insights-panel panel${overviewOpen ? " open" : ""}`} aria-labelledby="overview-title">
        <button type="button" className="overview-toggle" aria-expanded={overviewOpen} aria-controls="overview-content" onClick={() => setOverviewOpen((open) => !open)}>Overview<ChevronDown aria-hidden="true" /></button>
        <h2 className="overview-title" id="overview-title">Overview</h2>
        <div className="overview-content" id="overview-content">
        {goal.total > 0 && <div className="insight-section goal-insight"><h3>One of each</h3><p>Regular Common, Uncommon, and Rare cards · no Epic, alternate art, or over-numbered printings</p><div className="goal-body"><div className="goal-ring" style={{ "--progress": `${100 * goal.owned / goal.total}%` } as CSSProperties} aria-hidden="true"><span>{Math.floor(100 * goal.owned / goal.total)}%</span></div><div className="goal-total"><strong>{goal.owned} / {goal.total}</strong><span>{goal.total - goal.owned} missing</span></div></div>{goal.missing.length > 0 && <details className="goal-missing"><summary>See missing cards<ChevronDown aria-hidden="true" /></summary><ul>{goal.missing.map((card) => <li key={card.code}>{card.name}<small>{card.set} · {card.number}</small></li>)}</ul></details>}</div>}
        <div className="insight-section"><h3>By set</h3><p>Unique printings owned</p>{setSummary.map(({ set, owned, total }) => <button type="button" className={`stat-row ${selectedSet === set ? "selected" : ""}`} aria-pressed={selectedSet === set} key={set} onClick={() => setSelectedSet(set)}><span className="stat-title">{set}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ "--progress": ratio(owned, total) } as CSSProperties} /></span></button>)}</div>
        <div className="insight-section"><h3>By domain</h3><p>Unique printings in {setLabel}</p>{colorSummary.map(({ color, owned, total }) => <div className={`stat-row passive domain-${color.toLowerCase()}`} key={color}><span className="stat-title">{color}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ "--progress": ratio(owned, total) } as CSSProperties} /></span></div>)}</div>
        <div className="insight-section price-insight"><h3>Card values</h3>{prices ? <><p>Cardmarket 7-day sale averages in EUR, updated {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p><h4>Most valuable priced card</h4>{priceHighlights.mostValuable ? <button type="button" className="price-card-row" onClick={() => setSelectedCard(priceHighlights.mostValuable!.card)}><span>{priceHighlights.mostValuable.card.name}<small>{priceHighlights.mostValuable.card.set} · {priceHighlights.mostValuable.finish}</small></span><strong>{formatPrice(priceHighlights.mostValuable.amount)}</strong></button> : <p>No owned cards have a 7-day average yet.</p>}<p className="price-coverage">{priceHighlights.pricedOwned} of {ownedTotal} owned printings priced</p><h4>Unowned cards to watch</h4>{priceHighlights.watch.length ? priceHighlights.watch.map((item) => <button type="button" className="price-card-row" key={`${item.card.code}-${item.finish}`} onClick={() => setSelectedCard(item.card)}><span>{item.card.name}<small>{item.card.number.toUpperCase()} · {item.finish}</small></span><strong>{formatPrice(item.amount)}</strong></button>) : <p>No matched 7-day prices in this set.</p>}</> : priceError ? <p>{priceError}</p> : <div role="status" aria-label="Loading recent prices"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-row" /><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-row" /></div>}<p className="price-source"><a href="https://www.cardmarket.com/en/Riftbound/Data/Price-Guide" target="_blank" rel="noreferrer">Cardmarket price guide</a> · Estimates vary by condition and language.</p></div>
        </div>
      </aside>
      {visibleCards.length ? <div className="card-grid" aria-label="Cards">{visibleCards.map((card) => <CardTile key={card.code} card={card} deckGoal={deckGoals.get(deckCardKey(card))} showNeed={status === "needs"} onOpen={setSelectedCard} />)}</div> : <div className="empty-state"><p>{status === "needs" ? "No cards need more copies for these filters." : "No cards match these filters."}</p><button type="button" className="secondary-button" onClick={() => { setSearch(""); setStatus("all"); setSelectedRarities([]); }}>Clear filters</button></div>}
    </div>
    </div>}
    <Dialog open={selectedCard !== null} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
      {selectedCard && <DialogContent className="card-detail-dialog">
        <div className="card-detail-art">{selectedCard.image ? <img src={selectedCard.image} alt={`${selectedCard.name} card`} /> : <span>Image unavailable</span>}</div>
        <div className="card-detail-copy">
          <p className="card-detail-meta">{selectedCard.set} · {selectedCard.number.toUpperCase()}</p>
          <DialogTitle className="card-detail-title">{selectedCard.name}</DialogTitle>
          <div className="card-detail-facts">{selectedCard.domains.map((domain) => <span className={`domain-chip domain-${domain.toLowerCase()}`} key={domain}>{domain}</span>)}{selectedRarity && <span className={`card-rarity-label rarity-${selectedRarity.kind}`}>{selectedRarity.label}</span>}<span className="owned-chip">{selectedCard.quantity === 0 ? "Not owned" : `${formatNumber(selectedCard.quantity)} ${selectedCard.quantity === 1 ? "copy" : "copies"} owned${selectedCard.foilQuantity ? ` · ${formatNumber(selectedCard.foilQuantity)} foil` : ""}`}</span></div>
          {status === "needs" && selectedDeckGoal && <p className="playset-detail">{selectedDeckGoal.owned} of {selectedDeckGoal.limit} deck copies owned across all printings · need {selectedDeckGoal.missing} more</p>}
          <DialogDescription className="visually-hidden">Card details and estimated price</DialogDescription>
          <div className="card-detail-prices">
            <p className="estimate-label">Estimated price per card</p>
            {selectedEstimate ? <strong className="estimate-value">{selectedEstimate}</strong> : <p className="estimate-unavailable">{prices ? "No reliable price estimate for this printing." : priceError || "Loading recent prices…"}</p>}
            {selectedQuote?.standard != null && <div className="finish-price"><span>Standard</span><strong>{formatPrice(selectedQuote.standard)}</strong></div>}
            {selectedQuote?.foil != null && <div className="finish-price"><span>Foil</span><strong>{formatPrice(selectedQuote.foil)}</strong></div>}
            {prices && <p className="price-method">Cardmarket 7-day sale average in EUR, updated {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}. Varies by condition and language.</p>}
          </div>
        </div>
      </DialogContent>}
    </Dialog>
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open && !busy) setPreview(null); }}>
      {preview && <DialogContent className="import-dialog" onInteractOutside={(event) => { if (busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onCloseAutoFocus={(event) => { event.preventDefault(); importTrigger.current?.focus(); }}>
        <div className="dialog-top"><DialogTitle><span id="import-title">Review this export</span></DialogTitle><DialogDescription>{preview.filename}</DialogDescription></div>
        <div className="stat-tiles"><div><strong>{preview.difference.incomingRows}</strong><span>rows in file</span></div><div className="accent"><strong>{preview.difference.newCards.length}</strong><span>new cards</span></div><div><strong>{preview.difference.newFoils.length}</strong><span>foil additions</span></div></div>
        <div className="dialog-scroll"><DifferenceList title="Cards you did not own" items={preview.difference.newCards} /><DifferenceList title="New foil copies" items={preview.difference.newFoils} /><DifferenceList title="More standard copies" items={preview.difference.moreCopies} />{preview.difference.removedCopies > 0 && <p className="removal-note">This export removes or changes the finish of {preview.difference.removedCopies} previously recorded copies.</p>}{preview.difference.newCards.length + preview.difference.newFoils.length + preview.difference.moreCopies.length === 0 && preview.difference.removedCopies === 0 && <p className="no-changes">No quantity changes found. You can still save this export as your latest snapshot.</p>}</div>
        {error && <p className="error-note" role="alert">{error}</p>}
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setPreview(null)} disabled={busy}>Cancel</button><button className="primary-button" type="button" onClick={applyImport} disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save this collection"}</button></div>
        <p className="dialog-help">Saving makes this the latest collection. Earlier imports remain in History. Importing the same file again will not add copies twice.</p>
      </DialogContent>}
    </Dialog>
    </main>
    <footer className="site-footer"><p>Card images and names © Riot Games. Card catalog via <a href="https://github.com/LouisCourrian/riftbound-cards" target="_blank" rel="noreferrer">riftbound-cards</a>.</p></footer>
  </>;
}

function CardTile({ card, deckGoal, showNeed, onOpen }: { card: DisplayCard; deckGoal?: DeckCopyGoal; showNeed: boolean; onOpen: (card: DisplayCard) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth === 0) setImageFailed(true);
  }, []);
  const shiny = hasFoilTreatment(card);
  const rarity = rarityFor(card);
  const copyLimit = deckCopyLimit(card);
  const deckOwned = deckGoal?.owned ?? card.quantity;
  const deckProgress = copyLimit === null ? 0 : Math.min(deckOwned / copyLimit, 1);
  return <article className="card-tile"><button type="button" className="card-open" onClick={() => onOpen(card)} aria-label={`View ${deckCardName(card)} larger, ${rarity?.label ?? card.rarity}, ${card.quantity} of this printing owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}${copyLimit === null ? ", token" : `, ${Math.min(deckOwned, copyLimit)} of ${copyLimit} deck copies across printings`}${showNeed && deckGoal ? `, need ${deckGoal.missing} more` : ""}`}><div className={`card-frame${shiny ? " shiny" : ""}${card.quantity ? "" : " missing"}`}><div className={`card-image-wrap ${card.quantity ? "" : "missing"}`}>
    {card.image && !imageFailed ? <img ref={image} src={card.image} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : <span className="no-image">Image unavailable</span>}
    <span className={`quantity-badge${shiny ? " shiny" : ""}`}>×{card.quantity}</span>
  </div></div><span className={`card-domains${copyLimit === null ? " token" : ""}`} aria-hidden="true" style={{ "--deck-progress": deckProgress } as CSSProperties}>{card.domains.map((domain) => <span className={`domain-${domain.toLowerCase()}`} key={domain} />)}</span><div className="card-meta"><span className="card-number">{card.number.toUpperCase()}</span><span className={`card-rarity rarity-${rarity?.kind ?? "other"}`}>{card.rarity}</span></div><strong className="card-name" title={deckCardName(card)}>{card.name}</strong><p className="card-set">{card.set}</p>{showNeed && deckGoal && <p className="card-need"><strong>Need {deckGoal.missing}</strong><span>{deckGoal.owned}/{deckGoal.limit} owned</span></p>}</button></article>;
}

function DifferenceList({ title, items }: { title: string; items: ImportDifference["newCards"] }) {
  if (!items.length) return null;
  return <section className="difference-list"><h3>{title} <span>{items.length}</span></h3>{items.slice(0, 8).map((item, index) => <div className="difference-row" key={`${item.expansion}-${item.printNumber}-${index}`}><span>{item.name}<small>{item.expansion} · {item.printNumber}</small></span><b>+{item.quantity}</b></div>)}{items.length > 8 && <p>And {items.length - 8} more cards</p>}</section>;
}
