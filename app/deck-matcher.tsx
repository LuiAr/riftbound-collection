"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "../components/ui/alert-dialog";
import type { DisplayCard } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";
import type { SavedDeck } from "../lib/server-decks";
import DeckAdviser from "../components/deck-adviser";
import { parseAdvisorDeck, deckChanges } from "../lib/deck-advisor";
import type { DeckVersion } from "../lib/server-decks";
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
    return { deck, missing: match.matches.reduce((sum, item) => sum + item.missing, 0), unmatched: match.unmatched.length };
  }), [decks, cards]);
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
      const response = await fetch("/api/decks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckId: activeDeckId ?? undefined, name: deckName, deckText, hideRunes, hideTokens }),
      });
      const result = await response.json() as { deck?: SavedDeck; error?: string };
      if (!response.ok || !result.deck) throw new Error(result.error || "The deck could not be saved.");
      const saved = result.deck;
      setActiveDeckId(saved.deckId);
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
    <h1 id="deck-title">Decks & upgrades</h1>
    <p className="feature-intro">Open a saved deck or paste a list.</p>
    <div className="saved-decks-panel panel">
      <div className="panel-heading"><div><h2>Saved decks</h2><p>{!decksLoaded ? "Loading saved decks…" : decks.length ? "Latest collection counts" : "No saved decks yet."}</p></div><button type="button" className="secondary-button" onClick={newDeck} disabled={deckBusy}><Plus aria-hidden="true" />New deck</button></div>
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
