"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Plus, Trash2, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "../components/ui/alert-dialog";
import type { DisplayCard } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";
import type { DeckVersion, SavedDeck } from "../lib/deck-records";
import { deleteLocalDeck, exportDeckStore, importDeckStore, listDecks, saveLocalDeck, versionsFor } from "../lib/local-decks";
import DeckAdviser from "../components/deck-adviser";
import { parseAdvisorDeck, deckChanges } from "../lib/deck-advisor";
import MissingCardButton from "../components/missing-card-button";

export default function DeckMatcher({ cards, onOpenCard }: { cards: DisplayCard[]; onOpenCard: (card: DisplayCard) => void }) {
  const [reviewTab, setReviewTab] = useState("edit");
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckText, setDeckText] = useState("");
  const [hideRunes, setHideRunes] = useState(true);
  const [hideTokens, setHideTokens] = useState(true);
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
  const deckFile = useRef<HTMLInputElement>(null);
  const historical = versions.find(v => v.versionId === versionId);
  const revisionChanges = historical ? deckChanges(parseAdvisorDeck(historical.name, historical.deckText).deck.entries, parseAdvisorDeck(deckName, deckText).deck.entries) : [];
  useEffect(() => {
    if (!activeDeckId) return;
    try {
      const items = versionsFor(activeDeckId);
      setVersionHistory({ deckId: activeDeckId, versions: items, error: "" });
      setVersionId(items[0]?.versionId ?? "");
    } catch (e) { setVersionHistory({ deckId: activeDeckId, versions: [], error: e instanceof Error ? e.message : "Versions could not be loaded." }); }
  }, [activeDeckId, versionTick]);
  const analysis = useMemo(() => analyzeDeck(deckText, cards, { hideRunes, hideTokens }), [deckText, cards, hideRunes, hideTokens]);
  const savedSummaries = useMemo(() => decks.map((deck) => {
    const match = analyzeDeck(deck.deckText, cards, { hideRunes: deck.hideRunes, hideTokens: deck.hideTokens });
    return { deck, missing: match.matches.reduce((sum, item) => sum + item.missing, 0), unmatched: match.unmatched.length };
  }), [decks, cards]);
  const missing = analysis.matches.filter((item) => item.missing > 0);
  const missingText = missingList(analysis.matches);
  const requiredCopies = analysis.matches.reduce((sum, item) => sum + item.required, 0);
  const ownedCopies = analysis.matches.reduce((sum, item) => sum + item.owned, 0);

  useEffect(() => {
    try { setDecks(listDecks()); }
    catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "Saved decks could not be loaded."); }
    finally { setDecksLoaded(true); }
  }, []);

  function openDeck(deck: SavedDeck) {
    setReviewTab("review");
    setActiveDeckId(deck.deckId);
    setDeckName(deck.name);
    setDeckText(deck.deckText);
    setHideRunes(deck.hideRunes);
    setHideTokens(deck.hideTokens);
    setDeckStatus("");
    setCopyStatus("");
  }

  function newDeck() {
    setReviewTab("edit");
    setActiveDeckId(null);
    setDeckName("");
    setDeckText("");
    setHideRunes(true);
    setHideTokens(true);
    setDeckStatus("");
    setCopyStatus("");
  }

  async function saveCurrentDeck() {
    setDeckStatus("");
    if (!deckName.trim() || !deckText.trim()) { setDeckStatus("Enter a name and paste a deck list before saving."); return; }
    setDeckBusy(true);
    try {
      const saved = saveLocalDeck({ deckId: activeDeckId ?? undefined, name: deckName, deckText, hideRunes, hideTokens });
      setActiveDeckId(saved.deckId);
      setDecks(listDecks());
      setVersionTick(t => t + 1);
      setDeckStatus("Deck saved in this browser. Missing counts use the latest collection file.");
    } catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "The deck could not be saved."); }
    finally { setDeckBusy(false); }
  }

  async function removeCurrentDeck() {
    if (!activeDeckId) return;
    setConfirmDelete(false);
    setDeckBusy(true);
    setDeckStatus("");
    try {
      if (!deleteLocalDeck(activeDeckId)) throw new Error("Saved deck not found.");
      setDecks(listDecks());
      newDeck();
      setDeckStatus("Saved deck deleted from this browser.");
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
    <h1 id="deck-title">Decks & upgrades</h1>
    <p className="feature-intro">Open a saved deck or paste a list.</p>
    <div className="saved-decks-panel panel">
      <div className="panel-heading"><div><h2>Saved decks</h2><p>{!decksLoaded ? "Loading saved decks…" : decks.length ? "Stored in this browser" : "No saved decks yet."}</p></div><div className="head-actions"><button type="button" className="secondary-button" onClick={() => { const url = URL.createObjectURL(new Blob([exportDeckStore()], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "saved-decks.json"; link.click(); URL.revokeObjectURL(url); }}><Download aria-hidden="true" />Download JSON</button><button type="button" className="secondary-button" onClick={() => deckFile.current?.click()}><Upload aria-hidden="true" />Import JSON</button><button type="button" className="secondary-button" onClick={newDeck} disabled={deckBusy}><Plus aria-hidden="true" />New deck</button></div></div>
      <input ref={deckFile} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import a saved-decks JSON file" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { importDeckStore(await file.text()); setDecks(listDecks()); setDeckStatus("Imported decks into this browser. Commit the same file as data/saved-decks.json to publish it."); } catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "The deck file could not be imported."); } finally { if (deckFile.current) deckFile.current.value = ""; } }} />
      <p className="head-note">Decks stay in this browser. Download the JSON and commit it as data/saved-decks.json so a browser with no saved decks loads that file.</p>
      {!decksLoaded && <div className="saved-deck-list" aria-hidden="true"><span className="saved-deck-item skeleton" /><span className="saved-deck-item skeleton" /><span className="saved-deck-item skeleton" /></div>}
      {savedSummaries.length > 0 && <div className="saved-deck-list">{savedSummaries.map(({ deck, missing: count, unmatched }) => <button type="button" key={deck.deckId} className={`saved-deck-item ${activeDeckId === deck.deckId ? "selected" : ""}`} aria-pressed={activeDeckId === deck.deckId} onClick={() => openDeck(deck)} disabled={deckBusy}><strong>{deck.name}</strong><span>{count} missing{unmatched ? ` · ${unmatched} unmatched` : ""}</span></button>)}</div>}
    </div>
    <div className="panel matcher-workspace">
      {deckText.trim() && <h2 className="matcher-deck-title">{deckName.trim() || "Untitled deck"}</h2>}
      <Tabs className="deck-review-tabs" value={reviewTab} onValueChange={setReviewTab}>
        <TabsList aria-label="Saved deck workspace"><TabsTrigger value="missing" disabled={!deckText.trim()}>Missing</TabsTrigger><TabsTrigger value="review" disabled={!deckText.trim()}>Review</TabsTrigger><TabsTrigger value="edit">Edit list</TabsTrigger>{activeDeckId && <TabsTrigger value="versions">History</TabsTrigger>}</TabsList>
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
        <div className="deck-save-actions"><button type="button" className="secondary-button" disabled={!deckText.trim()} onClick={() => setReviewTab("review")}>Review deck</button><button type="button" className="primary-button" onClick={saveCurrentDeck} disabled={deckBusy || !deckText.trim()} aria-busy={deckBusy}>{deckBusy ? "Saving…" : activeDeckId ? "Save changes" : "Save deck"}</button>{activeDeckId && <button type="button" className="deck-delete-button" onClick={() => setConfirmDelete(true)} disabled={deckBusy}><Trash2 aria-hidden="true" />Delete saved deck</button>}</div>
        {deckStatus && <p className="deck-copy-status" role="status">{deckStatus}</p>}
      </div>
      </TabsContent>
      <TabsContent value="missing">
      <div className="deck-result-panel panel" aria-live="polite">
        <div className="deck-result-top panel-heading"><div><h2>Missing cards</h2><p>Latest collection</p></div><button className="primary-button" type="button" onClick={copyMissing} disabled={!missingText}><Copy aria-hidden="true" />Copy list</button></div>
        {deckText.trim() ? <>
          <div className="stat-tiles deck-totals"><div><strong>{requiredCopies}</strong><span>Needed</span></div><div><strong>{ownedCopies}</strong><span>Covered</span></div><div className="accent"><strong>{requiredCopies - ownedCopies}</strong><span>Missing</span></div></div>
          {missing.length ? <div className="deck-missing-list">{missing.map((item) => <MissingCardButton key={item.name} card={item.card} name={item.name} count={item.missing} detail={`${item.owned} of ${item.required} owned · ${item.card.set}`} onOpen={onOpenCard} />)}</div> : <p className="deck-empty">{analysis.matches.length ? "You have every matched card in this deck." : "No matching cards to compare. Check the pasted format or filters."}</p>}
          {missingText && <details className="review-fold"><summary>Copyable missing list</summary><textarea className="deck-copy-text" aria-label="Missing cards as copyable text" readOnly value={missingText} onFocus={(event) => event.target.select()} /></details>}
          {analysis.unmatched.length > 0 && <div className="deck-unmatched"><h3>Couldn’t match {analysis.unmatched.length} {analysis.unmatched.length === 1 ? "line" : "lines"}</h3><p>Check these names against the catalog. They are left out of the copied list.</p><ul>{analysis.unmatched.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div>}
        </> : <p className="deck-empty">Your missing list will appear here after you paste a deck.</p>}
        {copyStatus && <p className="deck-copy-status" role="status">{copyStatus}</p>}
      </div>
      </TabsContent>
      <TabsContent value="review" forceMount hidden={reviewTab !== "review"}>
      <DeckAdviser name={deckName} deckText={deckText} deckId={activeDeckId} onApply={text => { setDeckText(text); setReviewTab("edit"); setDeckStatus("Upgrade applied. Save to keep this version."); }} />
      </TabsContent>
    {activeDeckId && <TabsContent value="versions"><details className="panel deck-version-panel" open><summary>Saved versions ({versions.length})</summary>{versionError && <p className="error-note">{versionError}</p>}{!versions.length && !versionError && <p>Save a change to start a version history for this older deck.</p>}{versions.length > 0 && <><label><span className="field-label">Compare with your current draft</span><select value={versionId} onChange={e => setVersionId(e.target.value)}>{versions.map((v, i) => <option key={v.versionId} value={v.versionId}>{versions.length - i} · {new Date(v.createdAt).toLocaleString()} · {v.name}</option>)}</select></label>{historical && <><p>Saved analyzer: {historical.snapshot.advisorVersion}{historical.snapshot.legacy ? " · older deck captured when versioning began" : ""}. {historical.snapshot.analysis?.engineDeficit ?? "Unknown"} engine copies below its baseline.</p>{revisionChanges.length ? <ul>{revisionChanges.map(c => <li key={c.cardId}>{c.quantity > 0 ? "+" : ""}{c.quantity} {c.name}</li>)}</ul> : <p>The draft has the same card quantities as this version.</p>}<textarea readOnly aria-label="Historical deck list" value={historical.deckText} /><button className="secondary-button" type="button" onClick={() => { setDeckText(historical.deckText); setDeckName(historical.name); setReviewTab("edit"); setDeckStatus("Historical version loaded as a draft. Save to create a new version."); }}>Load as draft</button></>}</>}</details></TabsContent>}
      </Tabs>
    </div>
    <p className="deck-credit">Card names © Riot Games. Full card names via <a href="https://github.com/slimtreble/Riftbound-card-data" target="_blank" rel="noreferrer">Riftbound-card-data</a>.</p>
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent className="confirm-dialog">
        <AlertDialogTitle>Delete “{deckName}” from saved decks?</AlertDialogTitle>
        <AlertDialogDescription>The deck list is removed from your saved decks. Your collection is not affected.</AlertDialogDescription>
        <div className="dialog-actions"><AlertDialogPrimitive.Cancel className="secondary-button">Cancel</AlertDialogPrimitive.Cancel><AlertDialogPrimitive.Action className="danger-button" onClick={removeCurrentDeck}>Delete saved deck</AlertDialogPrimitive.Action></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
