"use client";

import { useMemo, useRef, useState } from "react";
import { displayCards, hasFoilTreatment, isAlternatePrinting, isOvernumbered, type DisplayCard, type ImportDifference } from "../lib/collection";
import type { CollectionSnapshot } from "../lib/server-collection";

type Props = { initial: CollectionSnapshot; accountName: string; signOutPath: string };
type Preview = { difference: ImportDifference; version: number; filename: string; csv: string };
const sets = ["Vendetta", "Vendetta Promos", "Unleashed", "Origins", "Spiritforged", "Proving Grounds"];
const colors = ["Fury", "Calm", "Mind", "Body", "Order", "Chaos", "Colorless"];
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

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
  const fileInput = useRef<HTMLInputElement>(null);

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
      <div className="brand"><span className="brand-mark">R</span><span>Riftbound <span className="brand-light">Collection</span></span></div>
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
    <div className="workspace-grid">
      <section className="main-column">
        <div className="grid-toolbar"><div><h2>Cards</h2><span>{formatNumber(visibleCards.length)} shown · {formatNumber(copies)} copies in {selectedSet === "All sets" ? "all sets" : selectedSet}</span></div><label className="search-box"><span className="visually-hidden">Search cards</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards or number" /></label></div>
        <div className="filters" role="group" aria-label="Card filters"><div className="filter-primary"><label>Set <select value={selectedSet} onChange={(event) => setSelectedSet(event.target.value)}><option>All sets</option>{sets.map((set) => <option key={set}>{set}</option>)}</select></label><div className="segmented" role="group" aria-label="Ownership"><button type="button" aria-pressed={status === "all"} className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>All</button><button type="button" aria-pressed={status === "owned"} className={status === "owned" ? "active" : ""} onClick={() => setStatus("owned")}>Owned</button><button type="button" aria-pressed={status === "missing"} className={status === "missing" ? "active" : ""} onClick={() => setStatus("missing")}>Not owned</button></div></div><div className="filter-exclusions"><label><input type="checkbox" checked={hideAlternates} onChange={(event) => setHideAlternates(event.target.checked)} />Hide alternate art</label><label><input type="checkbox" checked={hideOvernumbered} onChange={(event) => setHideOvernumbered(event.target.checked)} />Hide over-numbered</label></div></div>
        {visibleCards.length ? <div className="card-grid" aria-label="Cards">{visibleCards.map((card) => <CardTile key={card.code} card={card} />)}</div> : <div className="empty-state">No cards match these filters.</div>}
      </section>
      <aside className="insights-panel" aria-label="Collection breakdown">
        <div className="insight-section"><h3>By set</h3><p>Unique printings owned</p>{setSummary.map(({ set, owned, total }) => <button type="button" className={`stat-row ${selectedSet === set ? "selected" : ""}`} key={set} onClick={() => setSelectedSet(set)}><span className="stat-title">{set}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></button>)}</div>
        <div className="insight-section"><h3>By color</h3><p>Unique printings in {selectedSet === "All sets" ? "all sets" : selectedSet}</p>{colorSummary.map(({ color, owned, total }) => <div className="stat-row passive" key={color}><span className="stat-title">{color}</span><span className="stat-value">{owned}/{total}</span><span className="stat-track"><span style={{ width: `${100 * owned / total}%` }} /></span></div>)}</div>
        <p className="credit">Card images and names © Riot Games. Card catalog via <a href="https://github.com/LouisCourrian/riftbound-cards" target="_blank" rel="noreferrer">riftbound-cards</a>.</p>
      </aside>
    </div>
    {preview && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setPreview(null); }}><section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><div className="dialog-top"><div><p className="eyebrow">CARD NEXUS IMPORT</p><h2 id="import-title">Review this export</h2><p>{preview.filename}</p></div><button className="close-button" type="button" aria-label="Close import review" onClick={() => setPreview(null)} disabled={busy}>×</button></div><div className="dialog-summary"><div><strong>{preview.difference.incomingRows}</strong><span>rows in file</span></div><div><strong>{preview.difference.newCards.length}</strong><span>new cards</span></div><div><strong>{preview.difference.newFoils.length}</strong><span>foil additions</span></div></div><div className="dialog-scroll"><DifferenceList title="Cards you did not own" items={preview.difference.newCards} /><DifferenceList title="New foil copies" items={preview.difference.newFoils} /><DifferenceList title="More standard copies" items={preview.difference.moreCopies} />{preview.difference.removedCopies > 0 && <p className="removal-note">This export removes or changes the finish of {preview.difference.removedCopies} previously recorded copies.</p>}{preview.difference.newCards.length + preview.difference.newFoils.length + preview.difference.moreCopies.length === 0 && preview.difference.removedCopies === 0 && <p className="no-changes">No quantity changes found. You can still save this export as your latest snapshot.</p>}</div>{error && <p className="error-note" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setPreview(null)} disabled={busy}>Cancel</button><button className="primary-button" type="button" onClick={applyImport} disabled={busy}>{busy ? "Saving…" : "Save this collection"}</button></div><p className="dialog-help">This replaces the previous Card Nexus snapshot. Importing the same file again will not add copies twice.</p></section></div>}
  </main>;
}

function CardTile({ card }: { card: DisplayCard }) {
  const shiny = hasFoilTreatment(card);
  return <article className="card-tile" aria-label={`${card.name}, ${card.quantity} owned${card.foilQuantity ? `, ${card.foilQuantity} foil` : ""}`}><div className={`card-image-wrap ${card.quantity ? "" : "missing"}`}>
    {card.image ? <img src={card.image} alt="" loading="lazy" /> : <span className="no-image">Image unavailable</span>}
    <span className={`quantity-badge${shiny ? " shiny" : ""}`}>{card.quantity}</span>
  </div><div className="card-meta"><span className="card-number">{card.number.toUpperCase()}</span><strong title={card.name}>{card.name}</strong></div><p className="card-set">{card.set}</p></article>;
}

function DifferenceList({ title, items }: { title: string; items: ImportDifference["newCards"] }) {
  if (!items.length) return null;
  return <section className="difference-list"><h3>{title} <span>{items.length}</span></h3>{items.slice(0, 8).map((item, index) => <div className="difference-row" key={`${item.expansion}-${item.printNumber}-${index}`}><span>{item.name}<small>{item.expansion} · {item.printNumber}</small></span><b>+{item.quantity}</b></div>)}{items.length > 8 && <p>And {items.length - 8} more cards</p>}</section>;
}
