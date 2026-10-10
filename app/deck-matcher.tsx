"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Plus, Trash2, Search, ClipboardPaste, Sparkles, Library, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "../components/ui/alert-dialog";
import type { DisplayCard } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";
import type { SavedDeck } from "../lib/server-decks";
import DeckAdviser from "../components/deck-adviser";
import { parseAdvisorDeck, deckChanges } from "../lib/deck-advisor";
import type { DeckVersion } from "../lib/server-decks";
import CardArtwork from "../components/card-artwork";
import { cardsById, representativeCard } from "../lib/deck-builder";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../components/ui/dialog";

export default function DeckMatcher({ cards, onOpenCard, refreshKey = 0, onBuild, onCollection, onActivity }: { cards: DisplayCard[]; onOpenCard: (card: DisplayCard) => void; refreshKey?: number; onBuild: () => void; onCollection: () => void; onActivity: () => void }) {
  const createTrigger = useRef<HTMLButtonElement>(null);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  function rememberTrigger() { dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function restoreFocus(event: Event, target = dialogTrigger.current) { event.preventDefault(); const visible = target && target.offsetParent !== null; (visible ? target : document.getElementById("main-content"))?.focus({ preventScroll: true }); }
  const [editorOpen, setEditorOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "missing">("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [baseline, setBaseline] = useState(JSON.stringify(["", "", true, true]));
  const [pendingDeck, setPendingDeck] = useState<SavedDeck | "new" | "discard" | null>(null);
  useEffect(() => {
    document.getElementById("main-content")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [editorOpen]);
  const [reviewTab, setReviewTab] = useState("edit");
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckText, setDeckText] = useState("");
  const [hideRunes, setHideRunes] = useState(true);
  const [hideTokens, setHideTokens] = useState(true);
  const dirty = baseline !== JSON.stringify([deckName, deckText, hideRunes, hideTokens]);
  const [copyStatus, setCopyStatus] = useState("");
  const [deckStatus, setDeckStatus] = useState("");
  const [deckBusy, setDeckBusy] = useState(false);
  const [decksLoaded, setDecksLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [versionHistory, setVersionHistory] = useState<{ deckId: string | null; versions: DeckVersion[]; error: string }>({ deckId: null, versions: [], error: "" });
  const versions = versionHistory.deckId === activeDeckId ? versionHistory.versions : [];
  const [versionId, setVersionId] = useState("");
  const versionError = versionHistory.deckId === activeDeckId ? versionHistory.error : "";
  const [versionTick, setVersionTick] = useState(0);
  const historical = versions.find(v => v.versionId === versionId);
  const revisionChanges = historical ? deckChanges(parseAdvisorDeck(historical.name, historical.deckText).deck.entries, parseAdvisorDeck(deckName, deckText).deck.entries) : [];
  useEffect(() => {
    let active = true;
    if (!activeDeckId) return;
    fetch(`/api/decks?deckId=${encodeURIComponent(activeDeckId)}`, { cache: "no-store" }).then(async response => {
      const result = await response.json() as { versions: DeckVersion[]; error?: string }; if (!response.ok) throw new Error(result.error || "Versions could not be loaded.");
      if (active) { setVersionHistory({ deckId: activeDeckId, versions: result.versions, error: "" }); setVersionId(result.versions[0]?.versionId ?? ""); }
    }).catch(e => { if (active) setVersionHistory({ deckId: activeDeckId, versions: [], error: e.message }); });
    return () => { active = false; };
  }, [activeDeckId, versionTick]);
  const analysis = useMemo(() => analyzeDeck(deckText, cards, { hideRunes, hideTokens }), [deckText, cards, hideRunes, hideTokens]);
  const savedSummaries = useMemo(() => decks.map((deck) => {
    const match = analyzeDeck(deck.deckText, cards, { hideRunes: deck.hideRunes, hideTokens: deck.hideTokens });
    const parsed = parseAdvisorDeck(deck.name, deck.deckText).deck;
    const legend = parsed.entries.find(e => e.section === "legend");
    const identity = legend ? cardsById.get(legend.cardId) : null;
    const cover = legend ? representativeCard(legend.cardId, cards) : match.matches[0]?.card;
    return { deck, cover, identity, required: match.matches.reduce((sum, item) => sum + item.required, 0), owned: match.matches.reduce((sum, item) => sum + item.owned, 0), missing: match.matches.reduce((sum, item) => sum + item.missing, 0), unmatched: match.unmatched.length };
  }), [decks, cards]);
  const filteredDecks = savedSummaries.filter(item => `${item.deck.name} ${item.identity?.tags.join(" ") ?? ""}`.toLowerCase().includes(query.toLowerCase().trim()) && (filter === "all" || (filter === "ready" ? item.required > 0 && item.missing === 0 && item.unmatched === 0 : item.missing > 0)));
  const heroCards = ["rogue assassin", "blade dancer"].map(id => representativeCard(id, cards)).filter((card): card is DisplayCard => Boolean(card?.image));
  const missing = analysis.matches.filter((item) => item.missing > 0);
  const missingText = missingList(analysis.matches);
  const requiredCopies = analysis.matches.reduce((sum, item) => sum + item.required, 0);
  const ownedCopies = analysis.matches.reduce((sum, item) => sum + item.owned, 0);

  useEffect(() => {
    let active = true;
    fetch("/api/decks", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { decks?: SavedDeck[]; error?: string };
      if (!response.ok || !result.decks) throw new Error(result.error || "Saved decks could not be loaded.");
      return result.decks;
    }).then((items) => { if (active) setDecks(items); }).catch((cause) => {
      if (active) setDeckStatus(cause instanceof Error ? cause.message : "Saved decks could not be loaded.");
    }).finally(() => { if (active) setDecksLoaded(true); });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function openDeck(deck: SavedDeck) {
    setReviewTab("cards");
    setEditorOpen(true);
    setOnlyMissing(false);
    setActiveDeckId(deck.deckId);
    setDeckName(deck.name);
    setDeckText(deck.deckText);
    setHideRunes(deck.hideRunes);
    setHideTokens(deck.hideTokens);
    setBaseline(JSON.stringify([deck.name, deck.deckText, deck.hideRunes, deck.hideTokens]));
    setDeckStatus("");
    setCopyStatus("");
  }

  function newDeck() {
    setReviewTab("edit");
    setEditorOpen(true);
    setOnlyMissing(false);
    setActiveDeckId(null);
    setDeckName("");
    setDeckText("");
    setHideRunes(true);
    setHideTokens(true);
    setBaseline(JSON.stringify(["", "", true, true]));
    setDeckStatus("");
    setCopyStatus("");
  }

  function requestOpen(deck: SavedDeck | "new") {
    rememberTrigger();
    setCreateOpen(false);
    if (dirty) { setPendingDeck(deck); return; }
    if (deck === "new") newDeck(); else openDeck(deck);
  }

  async function saveCurrentDeck() {
    setDeckStatus("");
    if (!deckName.trim() || !deckText.trim()) { setDeckStatus("Enter a name and paste a deck list before saving."); return; }
    setDeckBusy(true);
    try {
      const response = await fetch("/api/decks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckId: activeDeckId ?? undefined, name: deckName, deckText, hideRunes, hideTokens }),
      });
      const result = await response.json() as { deck?: SavedDeck; error?: string };
      if (!response.ok || !result.deck) throw new Error(result.error || "The deck could not be saved.");
      const saved = result.deck;
      setActiveDeckId(saved.deckId);
      setBaseline(JSON.stringify([saved.name, saved.deckText, saved.hideRunes, saved.hideTokens]));
      setDeckName(saved.name);
      setDeckText(saved.deckText);
      setDecks((current) => [saved, ...current.filter((item) => item.deckId !== saved.deckId)]);
      setVersionTick(t => t + 1);
      setDeckStatus("Deck version saved. Missing counts use your latest collection.");
    } catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "The deck could not be saved."); }
    finally { setDeckBusy(false); }
  }

  async function removeCurrentDeck() {
    if (!activeDeckId) return;
    setConfirmDelete(false);
    setDeckBusy(true);
    setDeckStatus("");
    try {
      const response = await fetch(`/api/decks?deckId=${encodeURIComponent(activeDeckId)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The deck could not be deleted.");
      setDecks((current) => current.filter((item) => item.deckId !== activeDeckId));
      newDeck();
      setEditorOpen(false);
      setDeckStatus("Saved deck deleted.");
    } catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "The deck could not be deleted."); }
    finally { setDeckBusy(false); }
  }

  async function copyMissing() {
    try {
      await navigator.clipboard.writeText(missingText);
      setCopyStatus("Missing list copied.");
    } catch { setCopyStatus("Copy failed. Select and copy the list below instead."); }
  }

  return <section className="feature-page deck-page view" aria-labelledby="deck-title">
    {!editorOpen && <>
      <div className="hub-heading"><div><h1 id="deck-title">Your decks.</h1><p>Build something worth bringing to the table.</p></div><div className="head-actions"><button className="secondary-button" type="button" onClick={() => requestOpen("new")}><ClipboardPaste aria-hidden="true" />Paste decklist</button><button ref={createTrigger} className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" />New deck</button></div></div>
      <section className="deck-hero"><div className="hero-copy"><span><Sparkles aria-hidden="true" />Made for your collection</span><h2>Your cards.<br />Your next deck.</h2><p>Find a champion, shape your strategy, and make every card count.</p><button className="primary-button" type="button" onClick={onBuild}>Find my next deck <ArrowRight aria-hidden="true" /></button></div><div className="hero-art" aria-hidden="true">{heroCards.map((card, i) => <img key={card.code} className={`hero-fan fan-${i}`} src={card.image!} alt="" />)}<Sparkles className="hero-spark" /></div></section>
      {dirty && <div className="draft-banner"><span>Your unsaved draft is still here.</span><button className="secondary-button" type="button" onClick={() => setEditorOpen(true)}>Resume draft <ArrowRight aria-hidden="true" /></button></div>}
      <div className="library-heading"><h2>Saved decks <span>{decks.length}</span></h2><label className="deck-library-search"><Search aria-hidden="true" /><input aria-label="Search saved decks" placeholder="Search your decks…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      <div className="hub-filters" role="group" aria-label="Filter saved decks">{([['all', 'All decks'], ['ready', 'All copies owned'], ['missing', 'Missing cards']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
      {!decksLoaded && <p className="head-note" role="status">Loading your decks…</p>}
      <div className="deck-library-grid">{filteredDecks.map(({ deck, cover, identity, required, owned, missing: count, unmatched }) => <button type="button" className="visual-deck-card" key={deck.deckId} onClick={() => requestOpen(deck)} disabled={deckBusy}><div className="deck-cover">{cover?.image ? <img src={cover.image} alt="" loading="lazy" /> : <img className="deck-cover-placeholder" src="/riftbound-logo-96.png" alt="" />}<span>{identity?.tags[0] ?? "Custom deck"}</span></div><div className="visual-deck-body"><h3>{deck.name}<ArrowRight aria-hidden="true" /></h3><p className="deck-domains">{identity?.domains.map(domain => <span key={domain}><i className={`domain-dot domain-${domain.toLowerCase()}`} aria-hidden="true" />{domain}</span>) ?? "Your saved list"}</p><div className="deck-ownership"><span className={`ownership-pill${count === 0 && unmatched === 0 && required > 0 ? " covered" : ""}`}>{unmatched ? `${unmatched} unmatched` : count ? `${count} missing` : required ? <><Check aria-hidden="true" />All copies owned</> : "Check list"}</span><small>{owned}/{required} copies</small></div><progress aria-label={`${deck.name}: owned copies`} value={owned} max={required || 1} /><div className="deck-updated">Updated {new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}<span>Open deck <ArrowRight aria-hidden="true" /></span></div></div></button>)}</div>
      {decksLoaded && !filteredDecks.length && <div className="deck-library-empty panel"><Sparkles aria-hidden="true" /><h3>{decks.length ? "No decks match these filters" : "Make room for your first deck."}</h3><p>{decks.length ? "Try a different name or ownership filter." : "Start with a champion or bring a decklist of your own."}</p><button className="secondary-button" type="button" onClick={decks.length ? () => { setQuery(""); setFilter("all"); } : () => setCreateOpen(true)}>{decks.length ? "Clear filters" : "Create a deck"}</button></div>}
      {deckStatus && <p className="head-note" role="status">{deckStatus}</p>}
      <div className="hub-utilities"><button type="button" onClick={onCollection}><Library aria-hidden="true" /><span><strong>Your collection</strong><small>Browse cards, missing copies, and prices</small></span><ArrowRight aria-hidden="true" /></button><button type="button" onClick={onActivity}><History aria-hidden="true" /><span><strong>Collection activity</strong><small>Compare imports and browse earlier snapshots</small></span><ArrowRight aria-hidden="true" /></button></div>
    </>}
    <div hidden={!editorOpen} className="matcher-workspace">
      <button className="back-link" type="button" onClick={() => setEditorOpen(false)}><ArrowLeft aria-hidden="true" />Your decks</button>
      <div className="hub-heading workspace-heading"><div><h1 id={editorOpen ? "deck-title" : undefined}>{deckName.trim() || "New deck"}</h1><p>{activeDeckId ? "Saved deck" : "New draft"} · Latest collection counts</p></div><div className="head-actions"><button type="button" className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(deckText); setCopyStatus("Decklist copied."); } catch { setCopyStatus("Copy unavailable. Select the text in Edit list."); } }} disabled={!deckText.trim()}><Copy aria-hidden="true" />Copy list</button><button className="primary-button" type="button" onClick={saveCurrentDeck} disabled={deckBusy || !deckText.trim() || !deckName.trim() || (Boolean(activeDeckId) && !dirty)} aria-busy={deckBusy}>{deckBusy ? "Saving…" : activeDeckId ? "Save changes" : "Save deck"}</button></div></div>
      {dirty && <div className="draft-banner"><span>Unsaved draft · Save changes to keep this version.</span><button className="secondary-button" type="button" disabled={deckBusy} onClick={() => { rememberTrigger(); setPendingDeck("discard"); }}>Discard edits</button></div>}
      {deckStatus && <p className="notice" role="status">{deckStatus}</p>}
      {copyStatus && <p className="head-note" role="status">{copyStatus}</p>}
      <Tabs className="deck-review-tabs" value={reviewTab} onValueChange={setReviewTab}>
        <TabsList aria-label="Saved deck workspace"><TabsTrigger value="cards" disabled={!deckText.trim()}>Cards</TabsTrigger><TabsTrigger value="review" disabled={!deckText.trim()}>Improve</TabsTrigger>{activeDeckId && <TabsTrigger value="versions">Versions</TabsTrigger>}<TabsTrigger value="edit">Edit list</TabsTrigger></TabsList>
        <TabsContent value="edit">
      <div className="deck-input-panel panel">
        <label className="field-label" htmlFor="deck-name">Deck name</label>
        <input id="deck-name" className="deck-name-input" maxLength={80} value={deckName} onChange={(event) => setDeckName(event.target.value)} placeholder="Name this deck" />
        <label className="field-label" htmlFor="deck-text">Deck list</label>
        <textarea id="deck-text" value={deckText} onChange={(event) => { setDeckText(event.target.value); setCopyStatus(""); }} placeholder={"Main Deck\n3x Card Name\n2x Another Card\n\nRunes\n6x Fury Rune"} spellCheck={false} />
        <p>Use lines like <strong>3x Card Name</strong>. Keep section headings.</p>
        <div className="deck-options" role="group" aria-label="Exclude from missing list">
          <label><input type="checkbox" checked={hideRunes} onChange={(event) => setHideRunes(event.target.checked)} /> Hide runes</label>
          <label><input type="checkbox" checked={hideTokens} onChange={(event) => setHideTokens(event.target.checked)} /> Hide tokens</label>
        </div>
        <div className="deck-save-actions"><button type="button" className="secondary-button" disabled={!deckText.trim()} onClick={() => setReviewTab("review")}>Review deck</button><button type="button" className="primary-button" onClick={saveCurrentDeck} disabled={deckBusy || !deckText.trim()} aria-busy={deckBusy}>{deckBusy ? "Saving…" : activeDeckId ? "Save changes" : "Save deck"}</button>{activeDeckId && <button type="button" className="deck-delete-button" onClick={() => { rememberTrigger(); setConfirmDelete(true); }} disabled={deckBusy}><Trash2 aria-hidden="true" />Delete saved deck</button>}</div>
      </div>
      </TabsContent>
      <TabsContent value="cards">
      <div className="deck-result-panel panel" aria-live="polite">
        <div className="deck-result-top panel-heading"><div><h2>Your cards</h2><p>Counts across all owned printings</p></div><div className="head-actions"><button className="secondary-button" type="button" aria-pressed={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>{onlyMissing ? "Show all cards" : "Missing only"}</button><button className="secondary-button" type="button" onClick={copyMissing} disabled={!missingText}><Copy aria-hidden="true" />Copy missing</button></div></div>
        {deckText.trim() ? <>
          <div className="stat-tiles deck-totals"><div><strong>{requiredCopies}</strong><span>Needed</span></div><div><strong>{ownedCopies}</strong><span>Covered</span></div><div className="accent"><strong>{requiredCopies - ownedCopies}</strong><span>Missing</span></div></div>
          <div className="saved-card-grid">{(onlyMissing ? missing : analysis.matches).map(item => <button className="saved-card-tile" type="button" key={item.name} onClick={() => onOpenCard(item.card)} aria-label={`${item.name}, ${item.required} deck copies, ${item.owned} owned, ${item.missing} missing`}><span className="saved-card-art"><CardArtwork src={item.card.image} alt="" lazy /><b>×{item.required}</b></span><strong>{item.name}</strong><small className={item.missing ? "needs-copies" : ""}>{item.missing ? `Own ${item.owned}/${item.required} · need ${item.missing}` : "All copies owned"}</small></button>)}</div>
          {!(onlyMissing ? missing : analysis.matches).length && <p className="deck-empty">{analysis.matches.length ? "You have every matched card in this deck." : "No matching cards to compare. Check the pasted format or filters."}</p>}
          {missingText && <details className="review-fold"><summary>Copyable missing list</summary><textarea className="deck-copy-text" aria-label="Missing cards as copyable text" readOnly value={missingText} onFocus={(event) => event.target.select()} /></details>}
          {analysis.unmatched.length > 0 && <div className="deck-unmatched"><h3>Couldn’t match {analysis.unmatched.length} {analysis.unmatched.length === 1 ? "line" : "lines"}</h3><p>Check these names against the catalog. They are left out of the copied list.</p><ul>{analysis.unmatched.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div>}
        </> : <p className="deck-empty">Your missing list will appear here after you paste a deck.</p>}
      </div>
      </TabsContent>
      <TabsContent value="review" forceMount hidden={reviewTab !== "review"}>
      <DeckAdviser name={deckName} deckText={deckText} deckId={activeDeckId} onApply={text => { setDeckText(text); setReviewTab("cards"); setDeckStatus("Upgrade applied. Save to keep this version."); }} />
      </TabsContent>
    {activeDeckId && <TabsContent value="versions"><details className="panel deck-version-panel" open><summary>Saved versions ({versions.length})</summary>{versionError && <p className="error-note">{versionError}</p>}{!versions.length && !versionError && <p>Save a change to start a version history for this older deck.</p>}{versions.length > 0 && <><label><span className="field-label">Compare with your current draft</span><select value={versionId} onChange={e => setVersionId(e.target.value)}>{versions.map((v, i) => <option key={v.versionId} value={v.versionId}>{versions.length - i} · {new Date(v.createdAt).toLocaleString()} · {v.name}</option>)}</select></label>{historical && <><p>Saved analyzer: {historical.snapshot.advisorVersion}{historical.snapshot.legacy ? " · older deck captured when versioning began" : ""}. {historical.snapshot.analysis?.engineDeficit ?? "Unknown"} engine copies below its baseline.</p>{revisionChanges.length ? <ul>{revisionChanges.map(c => <li key={c.cardId}>{c.quantity > 0 ? "+" : ""}{c.quantity} {c.name}</li>)}</ul> : <p>The draft has the same card quantities as this version.</p>}<textarea readOnly aria-label="Historical deck list" value={historical.deckText} /><button className="secondary-button" type="button" onClick={() => { setDeckText(historical.deckText); setDeckName(historical.name); setReviewTab("edit"); setDeckStatus("Historical version loaded as a draft. Save to create a new version."); }}>Load as draft</button></>}</>}</details></TabsContent>}
      </Tabs>
    </div>
    <p className="deck-credit">Card names © Riot Games. Full card names via <a href="https://github.com/slimtreble/Riftbound-card-data" target="_blank" rel="noreferrer">Riftbound-card-data</a>.</p>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="create-deck-dialog" onCloseAutoFocus={event => restoreFocus(event, createTrigger.current)}><DialogTitle>A new deck starts here.</DialogTitle><DialogDescription>Choose a champion or bring a list you want to try.</DialogDescription><div className="create-options"><button type="button" onClick={() => { setCreateOpen(false); onBuild(); }}><Sparkles aria-hidden="true" /><strong>Build from my cards</strong><span>Find a deck for a champion, with an optional purchase budget.</span><ArrowRight aria-hidden="true" /></button><button type="button" onClick={() => requestOpen("new")}><ClipboardPaste aria-hidden="true" /><strong>Paste a decklist</strong><span>See what you own, find missing copies, and review upgrades.</span><ArrowRight aria-hidden="true" /></button></div></DialogContent></Dialog>
    <AlertDialog open={pendingDeck !== null} onOpenChange={open => { if (!open) setPendingDeck(null); }}><AlertDialogContent className="confirm-dialog" onCloseAutoFocus={event => restoreFocus(event)}><AlertDialogTitle>{pendingDeck === "discard" ? "Discard your unsaved edits?" : "Replace your unsaved draft?"}</AlertDialogTitle><AlertDialogDescription>Your current edits will be discarded. Save the draft first to keep a version.</AlertDialogDescription><div className="dialog-actions"><AlertDialogPrimitive.Cancel className="secondary-button">Keep editing</AlertDialogPrimitive.Cancel><AlertDialogPrimitive.Action className="danger-button" onClick={() => { const next = pendingDeck; setPendingDeck(null); if (next === "discard") { const [name, text, runes, tokens] = JSON.parse(baseline) as [string, string, boolean, boolean]; setDeckName(name); setDeckText(text); setHideRunes(runes); setHideTokens(tokens); setReviewTab(text ? "cards" : "edit"); setDeckStatus("Draft edits discarded."); } else if (next === "new") newDeck(); else if (next) openDeck(next); }}>{pendingDeck === "discard" ? "Discard edits" : "Discard and open"}</AlertDialogPrimitive.Action></div></AlertDialogContent></AlertDialog>
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent className="confirm-dialog" onCloseAutoFocus={event => restoreFocus(event)}>
        <AlertDialogTitle>Delete “{deckName}” from saved decks?</AlertDialogTitle>
        <AlertDialogDescription>The deck list is removed from your saved decks. Your collection is not affected.</AlertDialogDescription>
        <div className="dialog-actions"><AlertDialogPrimitive.Cancel className="secondary-button">Cancel</AlertDialogPrimitive.Cancel><AlertDialogPrimitive.Action className="danger-button" onClick={removeCurrentDeck}>Delete saved deck</AlertDialogPrimitive.Action></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
