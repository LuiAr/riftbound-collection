"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, GalleryVertical, Grid2x2, Grid3x3, ImageOff, LayoutGrid, Layers3, ListChecks, NotebookTabs, Search, Upload } from "lucide-react";
import { cardsForCollectionView, compareInventories, exportCsv, hasFoilTreatment, isAlternatePrinting, isOvernumbered, parseCardNexusCsv, radianceChecklistComplete, type DisplayCard, type ImportDifference, type NexusPrice } from "../lib/collection";
import { matchesCardType, rarityFor, type RarityKind } from "../lib/rarity";
import { oneOfEachGoal } from "../lib/goals";
import { priceKey, type PriceQuote, type PriceSnapshot } from "../lib/prices";
import { deckCardKey, deckCardName, deckCopyGoals, deckCopyLimit, type DeckCopyGoal } from "../lib/deck-copy-limit";
import type { CollectionSnapshot, CollectionVersion } from "../lib/collection-snapshot";
import { sitePath } from "../lib/site-path";
import { useStaticSite } from "./static-context";
import SingleFilter from "../components/single-filter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import DeckMatcher from "./deck-matcher";
import DeckBuilder from "./deck-builder";
import HistoryCompare from "./history-compare";
import CardArtwork from "../components/card-artwork";
import MissingCardButton from "../components/missing-card-button";
import CardBinder, { type BinderLayout } from "../components/card-binder";
import CardChecklist from "../components/card-checklist";
import { CollectorStrip, DeckPips, RarityGem, deckPips, setCode } from "../components/ledger";

type Props = { initial: CollectionSnapshot; initialHistory: CollectionVersion[]; snapshots: Record<string, CollectionSnapshot> };
type Preview = { difference: ImportDifference; version: number; filename: string; csv: string };
const mainSets = [
  { name: "Radiance", number: 5 },
  { name: "Vendetta", number: 4 },
  { name: "Unleashed", number: 3 },
  { name: "Spiritforged", number: 2 },
  { name: "Origins", number: 1 },
];
const ownershipOptions: { value: Ownership; label: string }[] = [{ value: "all", label: "All cards" }, { value: "owned", label: "Owned" }, { value: "missing", label: "Missing" }, { value: "needs", label: "Need copies" }];
const colors = ["Fury", "Calm", "Mind", "Body", "Order", "Chaos", "Colorless"];
const rarityBreakdownLabels: Record<RarityKind, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", special: "Showcase" };
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
type CardView = "gallery" | "binder" | "checklist";
const VIEW_STORAGE_KEY = "riftbound-collection:card-view";

function readViewPreference(): { view: CardView; layout: BinderLayout } | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(VIEW_STORAGE_KEY) ?? "null");
    if (!saved) return null;
    return { view: saved.view === "binder" || saved.view === "checklist" ? saved.view : "gallery", layout: saved.layout === 2 ? 2 : 3 };
  } catch { return null; }
}

function saveViewPreference(view: CardView, layout: BinderLayout) {
  try { window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ view, layout })); } catch {}
}

function preferredPrinting(card: DisplayCard): number {
  if (card.extra) return 2;
  if (isAlternatePrinting(card) || isOvernumbered(card) || card.rarity === "Showcase") return 1;
  return 0;
}
const ratio = (part: number, whole: number) => whole > 0 ? part / whole : 0;
const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

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

function nexusEstimate(price: NexusPrice | undefined): string | null {
  if (!price) return null;
  const amounts = [price.standard, price.foil].filter((amount): amount is number => amount !== null);
  if (!amounts.length) return null;
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`;
}

function downloadText(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CollectionClient({ initial, initialHistory, snapshots }: Props) {
  const { market } = useStaticSite();
  const [currentSnapshot] = useState(initial);
  const [viewedSnapshot, setViewedSnapshot] = useState<CollectionSnapshot | null>(null);
  const [history] = useState(initialHistory);
  const [section, setSection] = useState<"collection" | "decks" | "builder" | "history">("collection");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    if (requested === "decks" || requested === "builder" || requested === "history") setSection(requested);
  }, []);
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
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [cardView, setCardView] = useState<CardView>("gallery");
  const [binderLayout, setBinderLayout] = useState<BinderLayout>(3);
  useEffect(() => {
    const saved = readViewPreference();
    if (saved) { setCardView(saved.view); setBinderLayout(saved.layout); }
  }, []);
  function chooseView(view: CardView, layout: BinderLayout = binderLayout) {
    setCardView(view);
    setBinderLayout(layout);
    saveViewPreference(view, layout);
  }
  const prices = market.prices;
  const priceError = market.priceError ?? "";
  const fileInput = useRef<HTMLInputElement>(null);
  const importTrigger = useRef<HTMLButtonElement>(null);
  const cardTrigger = useRef<HTMLElement | null>(null);

  function openCard(card: DisplayCard) {
    cardTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedCard(card);
  }

  const allCards = useMemo(() => cardsForCollectionView(snapshot.rows), [snapshot.rows]);
  const latestCards = useMemo(() => cardsForCollectionView(currentSnapshot.rows), [currentSnapshot.rows]);
  const deckCards = useMemo(() => latestCards.filter((card) => card.set !== "Radiance" && card.set !== "Radiance Promos"), [latestCards]);
  const sets = useMemo(() => mainSets.filter((set) => allCards.some((card) => card.set === set.name)), [allCards]);
  const setOptions = useMemo(() => [{ value: "All sets", label: "All sets" }, ...sets.map((set) => ({ value: set.name, label: `${set.number} · ${set.name}` }))], [sets]);
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
  const goalNote = radianceChecklistComplete && (selectedSet === "All sets" || selectedSet === "Radiance") ? "Radiance counts regular numbers 1–167 from the riftbound-cards checklist. Promos, runes, and cards without a sourced rarity stay out." : "";
  const setSummary = sets.map(({ name: set, number }) => {
    const cards = allCards.filter((card) => card.set === set);
    return { set, number, owned: cards.filter((card) => card.quantity > 0).length, total: cards.length };
  }).filter((item) => item.total > 0);
  const selectedSetNumber = mainSets.find((set) => set.name === selectedSet)?.number;
  const bannerCode = selectedSet === "All sets" ? `${sets.length} main sets` : selectedSetNumber ? `Set ${selectedSetNumber} · ${setCode(selectedSet)}` : setCode(selectedSet);
  const rarityBreakdown = useMemo(() => (Object.keys(rarityBreakdownLabels) as RarityKind[]).map((kind) => {
    const cards = setCards.filter((card) => rarityFor(card)?.kind === kind);
    return { kind, label: rarityBreakdownLabels[kind], owned: cards.filter((card) => card.quantity > 0).length, total: cards.length };
  }).filter((item) => item.total > 0), [setCards]);
  const chase = useMemo(() => {
    const missing = (kind: RarityKind) => setCards.filter((card) => !card.extra && card.quantity === 0 && rarityFor(card)?.kind === kind && !isAlternatePrinting(card) && !isOvernumbered(card));
    const epics = missing("epic");
    const cards = (epics.length ? epics : missing("rare")).sort((a, b) => a.set.localeCompare(b.set) || a.number.localeCompare(b.number, undefined, { numeric: true }));
    return { cards, label: epics.length ? (epics.length === 1 ? "Epic" : "Epics") : (cards.length === 1 ? "Rare" : "Rares") };
  }, [setCards]);
  const versionCounts = useMemo(() => history.filter((item) => snapshots[item.importId]).sort((a, b) => (a.importedAt ?? "").localeCompare(b.importedAt ?? "")).map((item) => {
    const counts = new Map<string, { quantity: number; foil: number }>();
    for (const card of cardsForCollectionView(snapshots[item.importId].rows)) if (card.quantity > 0) counts.set(card.code, { quantity: card.quantity, foil: card.foilQuantity });
    return { importedAt: item.importedAt, counts };
  }), [history, snapshots]);
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
  const selectedNexusPrice = selectedQuote ? undefined : selectedCard?.nexusPrice;
  const selectedNexusEstimate = nexusEstimate(selectedNexusPrice);
  const selectedRarity = selectedCard ? rarityFor(selectedCard) : null;
  const selectedDeckGoal = selectedCard ? deckGoals.get(deckCardKey(selectedCard)) : undefined;
  const selectedPips = selectedCard ? deckPips(selectedCard, selectedDeckGoal) : null;
  const selectedFullName = selectedCard ? deckCardName(selectedCard) : "";
  const selectedSubtitle = selectedCard && selectedFullName.length > selectedCard.name.length && selectedFullName.startsWith(selectedCard.name) ? selectedFullName.slice(selectedCard.name.length).replace(/^[\s,–-]+/, "") : "";
  const selectedIndex = selectedCard ? visibleCards.findIndex((card) => card.code === selectedCard.code) : -1;
  const previousCard = section === "collection" && selectedIndex > 0 ? visibleCards[selectedIndex - 1] : null;
  const nextCard = section === "collection" && selectedIndex >= 0 && selectedIndex < visibleCards.length - 1 ? visibleCards[selectedIndex + 1] : null;
  const selectedHistory = useMemo(() => {
    if (!selectedCard) return [];
    const events: { date: string | null; label: string; change: string; added: boolean }[] = [];
    let previous = { quantity: 0, foil: 0 };
    for (const version of versionCounts) {
      const current = version.counts.get(selectedCard.code) ?? { quantity: 0, foil: 0 };
      if (current.quantity !== previous.quantity || current.foil !== previous.foil) {
        const standardDelta = (current.quantity - current.foil) - (previous.quantity - previous.foil);
        const foilDelta = current.foil - previous.foil;
        const parts = [standardDelta ? `${standardDelta > 0 ? "+" : "−"}${Math.abs(standardDelta)} standard` : "", foilDelta ? `${foilDelta > 0 ? "+" : "−"}${Math.abs(foilDelta)} foil` : ""].filter(Boolean);
        const first = previous.quantity === 0 && current.quantity > 0 && events.length === 0;
        events.push({ date: version.importedAt, label: first ? "First recorded" : current.quantity > previous.quantity ? "New copies" : "Copies removed", change: first ? [current.quantity - current.foil ? `${current.quantity - current.foil} standard` : "", current.foil ? `${current.foil} foil` : ""].filter(Boolean).join(" · ") : parts.join(" · "), added: current.quantity >= previous.quantity });
      }
      previous = current;
    }
    return events;
  }, [selectedCard, versionCounts]);

  async function chooseFile(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (file.size > 2_000_000) throw new Error("This CSV is too large (2 MB maximum).");
      const csv = await file.text();
      const parsed = parseCardNexusCsv(csv);
      setPreview({ difference: compareInventories(currentSnapshot.rows, parsed.rows), version: currentSnapshot.version, filename: file.name, csv });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The file could not be reviewed."); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function viewVersion(importId: string) {
    setHistoryError("");
    if (importId === currentSnapshot.importId) {
      setViewedSnapshot(null);
      setSection("collection");
      return;
    }
    const next = snapshots[importId];
    if (!next) { setHistoryError("This version could not be loaded."); return; }
    setViewedSnapshot(next);
    setSection("collection");
  }

  const firstRun = !snapshot.importedAt && !viewedSnapshot;
  const setLabel = selectedSet === "All sets" ? "all sets" : selectedSet;
  const ownershipIndex = ownershipOptions.findIndex((option) => option.value === status);
  const openFilePicker = () => fileInput.current?.click();
  const importButton = <button ref={importTrigger} className="primary-button" type="button" onClick={openFilePicker} disabled={busy} aria-busy={busy}><Upload aria-hidden="true" />{busy ? "Working…" : "Compare a CSV"}</button>;

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header app-site-header">
      <div className="site-header-inner">
        <div className="brand"><img className="brand-mark" src={sitePath("/riftbound-logo-96.png")} alt="" width="44" height="44" /><span>Riftbound<span className="brand-light">Collection</span></span></div>
        <nav className="section-nav" aria-label="Website sections">
          <button type="button" className={section === "collection" ? "active" : ""} aria-current={section === "collection" ? "page" : undefined} onClick={() => setSection("collection")}><Layers3 aria-hidden="true" /><span className="nav-full">My collection</span><span className="nav-short" aria-hidden="true">Cards</span></button>
          <button type="button" className={section === "decks" ? "active" : ""} aria-current={section === "decks" ? "page" : undefined} onClick={() => setSection("decks")}><ChartNoAxesColumnIncreasing aria-hidden="true" /><span className="nav-full">Decks & upgrades</span><span className="nav-short" aria-hidden="true">Decks</span></button>
          <button type="button" className={section === "builder" ? "active" : ""} aria-current={section === "builder" ? "page" : undefined} onClick={() => setSection("builder")}><LayoutGrid aria-hidden="true" /><span className="nav-full">Deck builder</span><span className="nav-short" aria-hidden="true">Builder</span></button>
          <button type="button" className={section === "history" ? "active" : ""} aria-current={section === "history" ? "page" : undefined} onClick={() => setSection("history")}><Clock3 aria-hidden="true" /><span className="nav-full">History</span><span className="nav-short" aria-hidden="true">History</span></button>
          <a href={sitePath("/rules/")}><BookOpen aria-hidden="true" /><span className="nav-full">Rules &amp; reference</span><span className="nav-short" aria-hidden="true">Rules</span></a>
        </nav>
        <nav className="set-navigation" aria-labelledby="set-navigation-title">
          <div className="set-navigation-heading"><h2 id="set-navigation-title">By set</h2><button type="button" className={section === "collection" && selectedSet === "All sets" ? "all-sets-button active" : "all-sets-button"} aria-pressed={section === "collection" && selectedSet === "All sets"} onClick={() => { setSelectedSet("All sets"); setSection("collection"); }}>All sets</button></div>
          {viewedSnapshot && <p className="sidebar-version">Viewing version {viewedSnapshot.version}</p>}
          {setSummary.map(({ set, number, owned, total }) => <button type="button" className={`stat-row ${section === "collection" && selectedSet === set ? "selected" : ""}`} aria-pressed={section === "collection" && selectedSet === set} key={set} onClick={() => { setSelectedSet(set); setSection("collection"); }}><span className="set-tile" aria-hidden="true"><span>{number}</span><span>{setCode(set)}</span></span><span className="stat-title"><span className="visually-hidden">Set {number}, </span>{set}</span><span className="stat-value">{formatNumber(owned)}/{formatNumber(total)}</span><span className="stat-track"><span style={{ "--progress": ratio(owned, total) } as CSSProperties} /></span></button>)}
          <button className="sidebar-insights" type="button" aria-expanded={section === "collection" && overviewOpen} aria-controls={section === "collection" ? "overview-content" : undefined} onClick={() => { setSection("collection"); setOverviewOpen(section === "collection" ? !overviewOpen : true); }}><ChartNoAxesColumnIncreasing aria-hidden="true" />Collection insights<ChevronDown aria-hidden="true" /></button>
        </nav>
      </div>
    </header>
    <main className="collection-shell" id="main-content" tabIndex={-1}>
    {section === "history" && <section className="feature-page view" aria-labelledby="history-title">
      <h1 id="history-title">Collection history</h1>
      <p className="feature-intro">Each dated Card Nexus export in the repository appears here. Open a version to browse its cards without changing the latest collection.</p>
      <HistoryCompare key={currentSnapshot.importId ?? "empty"} history={history} latest={currentSnapshot} snapshots={snapshots} />
      {historyError && <p className="error-note" role="alert">{historyError}</p>}
      {history.length ? <div className="history-list">{history.map((item) => <button type="button" className={`history-item ${snapshot.importId === item.importId ? "selected" : ""}`} key={item.importId} onClick={() => viewVersion(item.importId)}><span><strong>{item.sourceName}</strong><small>{item.importedAt ? new Date(item.importedAt).toLocaleString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "Undated file"}</small></span><span className="history-item-side">{item.importId === currentSnapshot.importId ? "Latest" : `Version ${item.version}`}<ArrowRight aria-hidden="true" /></span></button>)}</div> : <div className="empty-state">Add a dated CSV under data/exports to build collection history.</div>}
    </section>}
    {section === "builder" && <DeckBuilder cards={deckCards} prices={prices} onOpenCard={openCard} />}
    {section === "decks" && <DeckMatcher cards={deckCards} onOpenCard={openCard} />}
    {section === "collection" && <div className="view">
    <section className="page-head">
      <div><h1>My collection</h1><p className="head-note">{snapshot.importedAt ? `${viewedSnapshot ? "Viewing" : "Current export"} ${new Date(snapshot.importedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} · ` : ""}{snapshot.sourceName ?? "data/collection.csv"}</p></div>
      {!viewedSnapshot && !firstRun && <div className="head-actions"><button className="secondary-button" type="button" onClick={() => downloadText(exportCsv(snapshot.headers, snapshot.rows), `riftbound-collection-${snapshot.importId ?? "current"}.csv`)}><Download aria-hidden="true" />Export CSV</button>{importButton}</div>}
      {!viewedSnapshot && <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Choose a Card Nexus CSV export" onChange={(event) => chooseFile(event.target.files?.[0])} />}
    </section>
    {viewedSnapshot && <div className="history-banner"><span>Viewing version {viewedSnapshot.version} from {new Date(viewedSnapshot.importedAt!).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}. Your latest collection is unchanged.</span><button type="button" onClick={() => setViewedSnapshot(null)}>Return to latest</button></div>}
    {error && !preview && <p className="error-note" role="alert">{error}</p>}
    <div className="workspace-grid">
      <div className={`collection-summary${firstRun ? " first-run" : ""}`}>
      {firstRun ? <section className="welcome-panel panel" aria-labelledby="welcome-title">
        <img src={sitePath("/riftbound-logo-96.png")} alt="" width="52" height="52" />
        <div><h2 id="welcome-title">Start with your Card Nexus export</h2><p>Export your collection from the Card Nexus app as a CSV file, then import it here to see every card you own and every card you are still missing.</p></div>
        {importButton}
      </section> : <section className="set-banner" aria-labelledby="progress-title">
        <div className="set-banner-top">
          <div className="set-banner-title"><p className="set-banner-code">{bannerCode}</p><h2 id="progress-title">{selectedSet}</h2></div>
          <p className="set-banner-count"><strong>{formatNumber(owned)}<span> / {formatNumber(setCards.length)}</span></strong><span>printings · {Math.floor(100 * ratio(owned, setCards.length))}%</span></p>
        </div>
        <div className="progress-bar" role="progressbar" aria-label={`${selectedSet} printings owned`} aria-valuemin={0} aria-valuemax={setCards.length} aria-valuenow={owned}><span style={{ "--progress": ratio(owned, setCards.length) } as CSSProperties} /></div>
        <ul className="rarity-tiles" aria-label="Printings owned by rarity">{rarityBreakdown.map((item) => <li key={item.kind} data-kind={item.kind}><span className="rarity-tile-label"><RarityGem kind={item.kind} />{item.label}</span><span className="rarity-tile-count"><strong>{formatNumber(item.owned)}</strong>/{formatNumber(item.total)}</span><span className="rarity-tile-track"><span style={{ "--progress": ratio(item.owned, item.total) } as CSSProperties} /></span></li>)}</ul>
        <ul className="set-banner-meta"><li><strong>{formatNumber(copies)}</strong> {copies === 1 ? "copy" : "copies"} in {setLabel}</li><li><strong>{formatNumber(foils)}</strong> foil {foils === 1 ? "copy" : "copies"}</li></ul>
        {goal.total > 0 && <CollectionGoal goal={goal} onOpen={openCard} id="goal-title" className="goal-insight banner-goal" note={goalNote} />}
      </section>}
      {!firstRun && <div className="summary-side panel"><ChaseList chase={chase} onOpen={openCard} id="chase-title" /></div>}
      </div>
      <div className="card-toolbar">
        <h2 className="visually-hidden">Cards</h2>
        <div className="toolbar-top">
          <div className="ownership-toggle" role="group" aria-label="Ownership" style={{ "--index": ownershipIndex } as CSSProperties}>{ownershipOptions.map((option) => <button type="button" key={option.value} aria-pressed={status === option.value} onClick={() => setStatus(option.value)}>{option.label}<span>{formatNumber(ownershipCounts[option.value])}</span></button>)}</div>
          <span className="result-count visually-hidden" role="status">{plural(visibleCards.length, "card", "cards")} shown</span>
        </div>
        <div className="filter-fields" role="group" aria-label="Card filters">
          <label className="filter-field search-field"><span>Search</span><span className="search-box"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards or number" /></span></label>
          <div className="mobile-set-filter"><SingleFilter label="Set" value={selectedSet} options={setOptions} onChange={setSelectedSet} /></div>
          <div className="filter-field rarity-filter-field"><span id="rarity-filter-label">Rarity &amp; printing</span><DropdownMenu><DropdownMenuTrigger aria-labelledby="rarity-filter-label rarity-filter-value" className="filter-trigger"><span id="rarity-filter-value">{selectedRarities.length === 0 ? "All rarities" : selectedRarities.length === 1 ? rarityOptions.find((option) => option.kind === selectedRarities[0])?.label : `${selectedRarities.length} rarities selected`}</span><ChevronDown aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="start" className="filter-menu"><DropdownMenuItem onSelect={() => setSelectedRarities([])}>All rarities</DropdownMenuItem><DropdownMenuSeparator />{rarityOptions.map(({ kind, label }) => <DropdownMenuCheckboxItem key={kind} checked={selectedRarities.includes(kind)} onCheckedChange={(checked) => setSelectedRarities((current) => checked ? [...current, kind] : current.filter((item) => item !== kind))} onSelect={(event) => event.preventDefault()}>{label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu></div>
        </div>
        <div className="view-bar">
          <span className="view-bar-count" aria-hidden="true">{plural(visibleCards.length, "card", "cards")}</span>
          <div className="view-bar-controls">
            {cardView === "binder" && <div className="segmented-toggle" role="group" aria-label="Cards per binder page"><button type="button" aria-pressed={binderLayout === 2} onClick={() => chooseView("binder", 2)} title="4 cards per page"><Grid2x2 aria-hidden="true" />2×2</button><button type="button" aria-pressed={binderLayout === 3} onClick={() => chooseView("binder", 3)} title="9 cards per page"><Grid3x3 aria-hidden="true" />3×3</button></div>}
            <div className="segmented-toggle" role="group" aria-label="Card view"><button type="button" aria-pressed={cardView === "gallery"} onClick={() => chooseView("gallery")}><GalleryVertical aria-hidden="true" />Gallery</button><button type="button" aria-pressed={cardView === "binder"} onClick={() => chooseView("binder")}><NotebookTabs aria-hidden="true" />Binder</button><button type="button" aria-pressed={cardView === "checklist"} onClick={() => chooseView("checklist")}><ListChecks aria-hidden="true" />Checklist</button></div>
          </div>
        </div>
        {status === "needs" && <p className="filter-note">Need copies to reach the deck limit: 3 per main-deck card, 1 per Legend or Battlefield. All printings count together; runes and tokens are excluded. Radiance printings stay out of this count until their deck types are reviewed.</p>}
      </div>
      <aside className={`insights-panel panel${overviewOpen ? " open" : ""}`} aria-labelledby="overview-title">
        <button type="button" className="overview-toggle" aria-expanded={overviewOpen} aria-controls="overview-content" onClick={() => setOverviewOpen((open) => !open)}>Collection insights<ChevronDown aria-hidden="true" /></button>
        <h2 className="overview-title" id="overview-title">Collection insights</h2>
        <div className="overview-content" id="overview-content">
        {!firstRun && goal.total > 0 && <CollectionGoal goal={goal} onOpen={openCard} id="mobile-goal-title" className="goal-insight mobile-goal-insight" note={goalNote} />}
        {!firstRun && <ChaseList chase={chase} onOpen={openCard} id="mobile-chase-title" className="chase-list mobile-chase-list" />}
        <div className="insight-section"><h3>By domain</h3><p>Unique printings in {setLabel}</p>{colorSummary.map(({ color, owned, total }) => <div className={`stat-row passive domain-${color.toLowerCase()}`} key={color}><span className="stat-title">{color}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ "--progress": ratio(owned, total) } as CSSProperties} /></span></div>)}</div>
        <div className="insight-section price-insight"><h3>Card values</h3>{prices ? <><p>Cardmarket 7-day sale averages in EUR, updated {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</p>{priceError && <p>{priceError}</p>}<h4>Most valuable priced card</h4>{priceHighlights.mostValuable ? <button type="button" className="price-card-row" onClick={() => openCard(priceHighlights.mostValuable!.card)}><span>{priceHighlights.mostValuable.card.name}<small>{priceHighlights.mostValuable.card.set} · {priceHighlights.mostValuable.finish}</small></span><strong>{formatPrice(priceHighlights.mostValuable.amount)}</strong></button> : <p>No owned cards have a 7-day average yet.</p>}<p className="price-coverage">{priceHighlights.pricedOwned} of {ownedTotal} owned printings priced</p><h4>Unowned cards to watch</h4>{priceHighlights.watch.length ? priceHighlights.watch.map((item) => <button type="button" className="price-card-row" key={`${item.card.code}-${item.finish}`} onClick={() => openCard(item.card)}><span>{item.card.name}<small>{item.card.number.toUpperCase()} · {item.finish}</small></span><strong>{formatPrice(item.amount)}</strong></button>) : <p>No matched 7-day prices in this set.</p>}</> : priceError ? <p>{priceError}</p> : <div role="status" aria-label="Loading recent prices"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-row" /><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-row" /></div>}<p className="price-source"><a href="https://www.cardmarket.com/en/Riftbound/Data/Price-Guide" target="_blank" rel="noreferrer">Cardmarket price guide</a> · Estimates vary by condition and language.</p></div>
        </div>
      </aside>
      {visibleCards.length && cardView === "binder" ? <CardBinder key={`${snapshot.importId}|${selectedSet}|${status}|${search.trim().toLowerCase()}|${selectedRarities.join(",")}`} cards={visibleCards} layout={binderLayout} goals={deckGoals} onOpen={openCard} /> : visibleCards.length && cardView === "checklist" ? <CardChecklist cards={visibleCards} goals={deckGoals} showNeed={status === "needs"} onOpen={openCard} /> : visibleCards.length ? <div className="card-grid" aria-label="Cards">{visibleCards.map((card) => <CardTile key={card.code} card={card} deckGoal={deckGoals.get(deckCardKey(card))} showNeed={status === "needs"} onOpen={openCard} />)}</div> : <div className="empty-state"><p>{status === "needs" ? "No cards need more copies for these filters." : "No cards match these filters."}</p><button type="button" className="secondary-button" onClick={() => { setSearch(""); setStatus("all"); setSelectedRarities([]); }}>Clear filters</button></div>}
    </div>
    </div>}
    <Dialog open={selectedCard !== null} onOpenChange={(open) => { if (!open) setSelectedCard(null); }}>
      {selectedCard && <DialogContent className="card-detail-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); cardTrigger.current?.focus(); }}>
        <div className="card-detail-art-panel"><div className={`card-detail-art${hasFoilTreatment(selectedCard) ? " shiny" : ""}`}><CardArtwork src={selectedCard.image} alt={`${selectedFullName} card`} /></div></div>
        <div className="card-detail-copy">
          <p className="card-detail-meta"><span className="set-chip">{mainSets.find((set) => set.name === selectedCard.set) ? `${mainSets.find((set) => set.name === selectedCard.set)!.number} · ` : ""}{setCode(selectedCard.set)}</span><span>{selectedCard.number}</span><span className="card-detail-set">{selectedCard.set}</span></p>
          <DialogTitle className="card-detail-title">{selectedCard.name}</DialogTitle>
          {selectedSubtitle && <p className="card-detail-subtitle">{selectedSubtitle}</p>}
          <div className="card-detail-facts">{selectedRarity ? <span className={`card-rarity-label rarity-${selectedRarity.kind}`}><RarityGem kind={selectedRarity.kind} />{selectedRarity.label}</span> : <span className="card-rarity-label">Unknown rarity</span>}{selectedCard.domains.map((domain) => <span className={`domain-chip domain-${domain.toLowerCase()}`} key={domain}>{domain}</span>)}{selectedCard.foilQuantity > 0 && <span className="foil-chip">Foil</span>}</div>
          <DialogDescription className="visually-hidden">Card details, copies owned, estimated price and history</DialogDescription>
          <div className="card-detail-stats">
            <div><span>Standard</span><strong>{formatNumber(selectedCard.quantity - selectedCard.foilQuantity)}</strong></div>
            <div className="foil-stat"><span>Foil</span><strong>{formatNumber(selectedCard.foilQuantity)}</strong></div>
            {selectedPips ? <div><span>Deck copies</span><span className="stat-pips"><DeckPips card={selectedCard} goal={selectedDeckGoal} /><strong>{selectedPips.owned} / {selectedPips.limit}</strong></span><small className={selectedDeckGoal?.missing ? "" : "complete"}>{selectedDeckGoal?.missing ? `Need ${selectedDeckGoal.missing} more across printings` : "Playset complete"}</small></div> : <div><span>Deck copies</span><small>Not counted for runes, tokens or Radiance</small></div>}
          </div>
          <div className="card-detail-boxes">
          <div className="card-detail-prices">
            <p className="estimate-label">Estimated price per card</p>
            {selectedEstimate ? <strong className="estimate-value">{selectedEstimate}</strong> : selectedNexusEstimate ? <strong className="estimate-value">{selectedNexusEstimate}</strong> : <p className="estimate-unavailable">{prices ? "No reliable price estimate for this printing." : priceError || "Loading recent prices…"}</p>}
            {selectedQuote?.standard != null && <div className="finish-price"><span>Standard</span><strong>{formatPrice(selectedQuote.standard)}</strong></div>}
            {selectedQuote?.foil != null && <div className="finish-price"><span>Foil</span><strong>{formatPrice(selectedQuote.foil)}</strong></div>}
            {!selectedQuote && selectedNexusPrice?.standard != null && <div className="finish-price"><span>Standard</span><strong>{formatPrice(selectedNexusPrice.standard)}</strong></div>}
            {!selectedQuote && selectedNexusPrice?.foil != null && <div className="finish-price"><span>Foil</span><strong>{formatPrice(selectedNexusPrice.foil)}</strong></div>}
            {selectedQuote && prices && <p className="price-method">Cardmarket 7-day sale average in EUR, updated {new Date(prices.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}. Varies by condition and language.</p>}
            {!selectedQuote && selectedNexusEstimate && <p className="price-method">Card Nexus export price in EUR from the collection file. This is not a Cardmarket sale average.</p>}
          </div>
          <div className="pull-history">
            <p className="estimate-label">Pull history</p>
            {selectedHistory.length ? <ol>{selectedHistory.map((event, index) => <li key={index} className={event.added ? "added" : "removed"}><span className="pull-date">{event.date ? new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Undated"}</span><span className="pull-label">{event.label}</span><strong>{event.change}</strong></li>)}</ol> : <p className="estimate-unavailable">Not in any saved export yet.</p>}
          </div>
          </div>
          {(previousCard || nextCard) && <div className="card-detail-nav">
            <button type="button" className="secondary-button" disabled={!previousCard} onClick={() => previousCard && setSelectedCard(previousCard)} aria-label={previousCard ? `Previous card, ${previousCard.name}, ${previousCard.number}` : "No previous card"}><ChevronLeft aria-hidden="true" />{previousCard?.number ?? ""}</button>
            <span>{selectedIndex + 1} of {visibleCards.length} shown</span>
            <button type="button" className="secondary-button" disabled={!nextCard} onClick={() => nextCard && setSelectedCard(nextCard)} aria-label={nextCard ? `Next card, ${nextCard.name}, ${nextCard.number}` : "No next card"}>{nextCard?.number ?? ""}<ChevronRight aria-hidden="true" /></button>
          </div>}
        </div>
      </DialogContent>}
    </Dialog>
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open && !busy) setPreview(null); }}>
      {preview && <DialogContent className="import-dialog" onInteractOutside={(event) => { if (busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onCloseAutoFocus={(event) => { event.preventDefault(); importTrigger.current?.focus(); }}>
        <div className="dialog-top"><DialogTitle><span id="import-title">Review this export</span></DialogTitle><DialogDescription>{preview.filename}</DialogDescription></div>
        <div className="stat-tiles"><div><strong>{preview.difference.incomingRows}</strong><span>rows in file</span></div><div className="accent"><strong>{preview.difference.newCards.length}</strong><span>new cards</span></div><div><strong>{preview.difference.newFoils.length}</strong><span>foil additions</span></div></div>
        <div className="dialog-scroll"><DifferenceList title="Cards you did not own" items={preview.difference.newCards} /><DifferenceList title="New foil copies" items={preview.difference.newFoils} /><DifferenceList title="More standard copies" items={preview.difference.moreCopies} />{preview.difference.removedCopies > 0 && <p className="removal-note">This export removes or changes the finish of {preview.difference.removedCopies} previously recorded copies.</p>}{preview.difference.newCards.length + preview.difference.newFoils.length + preview.difference.moreCopies.length === 0 && preview.difference.removedCopies === 0 && <p className="no-changes">No quantity changes found. You can still save this export as your latest snapshot.</p>}</div>
        {error && <p className="error-note" role="alert">{error}</p>}
        <div className="dialog-actions"><button className="primary-button" type="button" onClick={() => setPreview(null)}>Close</button></div>
        <p className="dialog-help">This comparison stays in the browser. To publish the file, save it as data/exports/YYYY-MM-DD.csv, replace data/collection.csv with the same export, and push.</p>
      </DialogContent>}
    </Dialog>
    </main>
    <footer className="site-footer"><p>Card images and names © Riot Games. Card catalog via <a href="https://github.com/LouisCourrian/riftbound-cards" target="_blank" rel="noreferrer">riftbound-cards</a>.</p></footer>
  </>;
}

function CollectionGoal({ goal, onOpen, id, className = "goal-insight", note = "" }: { goal: ReturnType<typeof oneOfEachGoal>; onOpen: (card: DisplayCard) => void; id: string; className?: string; note?: string }) {
  return <section className={className} aria-labelledby={id}><h2 id={id}>One of each</h2><p>Regular Common, Uncommon, and Rare cards · no Epic, alternate art, or over-numbered printings</p>{note && <p>{note}</p>}<div className="goal-body"><div className="goal-ring" style={{ "--progress": `${100 * goal.owned / goal.total}%` } as CSSProperties} aria-hidden="true"><span>{Math.floor(100 * goal.owned / goal.total)}%</span></div><div className="goal-total"><strong>{goal.owned} / {goal.total}</strong><span>{goal.total - goal.owned} missing</span></div></div>{goal.missing.length > 0 && <details className="goal-missing"><summary>See missing cards<ChevronDown aria-hidden="true" /></summary><ul>{goal.missing.map((card) => <li key={card.code}><MissingCardButton card={card} detail={`${card.set} · ${card.number.toUpperCase()}`} onOpen={onOpen} /></li>)}</ul></details>}</section>;
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
  const token = /-t\d+/i.test(card.code) || /^t\d+/i.test(card.number);
  const deckOwned = deckGoal?.owned ?? card.quantity;
  const tracked = copyLimit != null && copyLimit !== 12;
  return <article className="card-tile"><button type="button" className="card-open" onClick={() => onOpen(card)} aria-label={`View ${deckCardName(card)} larger, ${card.set} ${card.number}, ${rarity?.label ?? (card.rarity === "Unknown" ? "unknown rarity" : card.rarity)}, ${card.quantity ? `${card.quantity} of this printing owned` : "not owned"}${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}${token ? ", token" : tracked ? `, ${Math.min(deckOwned, copyLimit)} of ${copyLimit} deck copies across printings` : ""}${showNeed && deckGoal ? `, need ${deckGoal.missing} more` : ""}`}><div className={`card-frame${shiny ? " shiny" : ""}${card.quantity ? "" : " missing"}`}><div className={`card-image-wrap ${card.quantity ? "" : "missing"}`}>
    {card.image && !imageFailed ? <img ref={image} src={card.image} alt="" loading="lazy" onError={() => setImageFailed(true)} /> : <span className="no-image"><ImageOff aria-hidden="true" /><span>Image unavailable</span></span>}
    {card.quantity ? <span className={`quantity-badge${shiny ? " shiny" : ""}`}>×{card.quantity}</span> : <span className="sleeve-label" aria-hidden="true"><strong>{card.number}</strong><span>Empty sleeve</span></span>}
  </div></div><strong className="card-name" title={deckCardName(card)}>{card.name}</strong><CollectorStrip card={card} kind={rarity?.kind} goal={deckGoal} />{showNeed && deckGoal && <p className="card-need"><strong>Need {deckGoal.missing}</strong><span>{deckGoal.owned}/{deckGoal.limit} owned</span></p>}</button></article>;
}

function ChaseList({ chase, onOpen, id, className = "chase-list" }: { chase: { cards: DisplayCard[]; label: string }; onOpen: (card: DisplayCard) => void; id: string; className?: string }) {
  const shown = chase.cards.slice(0, 8);
  return <section className={className} aria-labelledby={id}><div className="chase-head"><h2 id={id}>Chase list</h2><span>{chase.cards.length ? `${formatNumber(chase.cards.length)} ${chase.label} to pull` : "Every Epic and Rare owned"}</span></div>{shown.length > 0 && <ul>{shown.map((card) => <li key={card.code}><button type="button" onClick={() => onOpen(card)}><span className="chase-number">{card.number}</span><RarityGem kind={rarityFor(card)?.kind} /><span className="chase-name">{card.name}</span><span className="chase-domains" aria-hidden="true">{card.domains.map((domain) => <span className={`domain-${domain.toLowerCase()}`} key={domain} />)}</span></button></li>)}</ul>}{chase.cards.length > shown.length && <p className="chase-more">And {formatNumber(chase.cards.length - shown.length)} more</p>}</section>;
}

function DifferenceList({ title, items }: { title: string; items: ImportDifference["newCards"] }) {
  if (!items.length) return null;
  return <section className="difference-list"><h3>{title} <span>{items.length}</span></h3>{items.slice(0, 8).map((item, index) => <div className="difference-row" key={`${item.expansion}-${item.printNumber}-${index}`}><span>{item.name}<small>{item.expansion} · {item.printNumber}</small></span><b>+{item.quantity}</b></div>)}{items.length > 8 && <p>And {items.length - 8} more cards</p>}</section>;
}
