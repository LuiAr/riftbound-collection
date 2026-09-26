"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisplayCard } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";
import type { SavedDeck } from "../lib/server-decks";

export default function DeckMatcher({ cards }: { cards: DisplayCard[] }) {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckText, setDeckText] = useState("");
  const [hideRunes, setHideRunes] = useState(true);
  const [hideTokens, setHideTokens] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [deckStatus, setDeckStatus] = useState("");
  const [deckBusy, setDeckBusy] = useState(false);
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
    });
    return () => { active = false; };
  }, []);

  function openDeck(deck: SavedDeck) {
    setActiveDeckId(deck.deckId);
    setDeckName(deck.name);
    setDeckText(deck.deckText);
    setHideRunes(deck.hideRunes);
    setHideTokens(deck.hideTokens);
    setDeckStatus("");
    setCopyStatus("");
  }

  function newDeck() {
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
      setDeckStatus("Deck saved. Missing counts use your latest collection.");
    } catch (cause) { setDeckStatus(cause instanceof Error ? cause.message : "The deck could not be saved."); }
    finally { setDeckBusy(false); }
  }

  async function removeCurrentDeck() {
    if (!activeDeckId || !window.confirm(`Delete “${deckName}” from saved decks?`)) return;
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

  return <section className="feature-page deck-page" aria-labelledby="deck-title">
    <p className="eyebrow">DECK MATCHER</p><h1 id="deck-title">What am I missing?</h1>
    <p className="feature-intro">Paste a deck list or open a saved deck. Missing counts always use your latest collection and update after each import. Lines such as <strong>3x Card Name</strong>, <strong>3 Card Name</strong>, and <strong>Card Name x3</strong> work.</p>
    <div className="saved-decks-panel">
      <div className="saved-decks-heading"><div><h2>Saved decks</h2><p>{decks.length ? "Missing copies in your latest collection" : "Save a deck to revisit it after your next import."}</p></div><button type="button" className="secondary-button" onClick={newDeck} disabled={deckBusy}>New deck</button></div>
      {savedSummaries.length > 0 && <div className="saved-deck-list">{savedSummaries.map(({ deck, missing: count, unmatched }) => <button type="button" key={deck.deckId} className={`saved-deck-item ${activeDeckId === deck.deckId ? "selected" : ""}`} onClick={() => openDeck(deck)} disabled={deckBusy}><strong>{deck.name}</strong><span>{count} missing{unmatched ? ` · ${unmatched} unmatched` : ""}</span></button>)}</div>}
    </div>
    <div className="deck-layout">
      <div className="deck-input-panel">
        <label htmlFor="deck-name">Deck name</label>
        <input id="deck-name" className="deck-name-input" maxLength={80} value={deckName} onChange={(event) => setDeckName(event.target.value)} placeholder="Name this deck" />
        <label htmlFor="deck-text">Deck list</label>
        <textarea id="deck-text" value={deckText} onChange={(event) => { setDeckText(event.target.value); setCopyStatus(""); }} placeholder={"Main Deck\n3x Card Name\n2x Another Card\n\nRunes\n6x Fury Rune"} spellCheck={false} />
        <p>Paste text, including section headings if the deck site provides them. Cards with different printings match by name.</p>
        <div className="deck-options" role="group" aria-label="Exclude from missing list">
          <label><input type="checkbox" checked={hideRunes} onChange={(event) => setHideRunes(event.target.checked)} /> Hide runes</label>
          <label><input type="checkbox" checked={hideTokens} onChange={(event) => setHideTokens(event.target.checked)} /> Hide tokens</label>
        </div>
        <div className="deck-save-actions"><button type="button" className="primary-button" onClick={saveCurrentDeck} disabled={deckBusy || !deckText.trim()}>{deckBusy ? "Saving…" : activeDeckId ? "Save changes" : "Save deck"}</button>{activeDeckId && <button type="button" className="deck-delete-button" onClick={removeCurrentDeck} disabled={deckBusy}>Delete saved deck</button>}</div>
        {deckStatus && <p className="deck-copy-status" role="status">{deckStatus}</p>}
      </div>
      <div className="deck-result-panel" aria-live="polite">
        <div className="deck-result-top"><div><h2>Missing cards</h2><p>Latest collection</p></div><button className="primary-button" type="button" onClick={copyMissing} disabled={!missingText}>Copy missing list</button></div>
        {deckText.trim() ? <>
          <div className="deck-totals"><div><strong>{requiredCopies}</strong><span>Needed</span></div><div><strong>{ownedCopies}</strong><span>Covered</span></div><div><strong>{requiredCopies - ownedCopies}</strong><span>Missing</span></div></div>
          {missing.length ? <div className="deck-missing-list">{missing.map((item) => <div className="deck-missing-row" key={item.name}><strong>{item.missing}x</strong><span>{item.name}<small>{item.owned} of {item.required} owned</small></span></div>)}</div> : <p className="deck-empty">{analysis.matches.length ? "You have every matched card in this deck." : "No matching cards to compare. Check the pasted format or filters."}</p>}
          {missingText && <textarea className="deck-copy-text" aria-label="Missing cards as copyable text" readOnly value={missingText} onFocus={(event) => event.target.select()} />}
          {analysis.unmatched.length > 0 && <div className="deck-unmatched"><h3>Couldn’t match {analysis.unmatched.length} {analysis.unmatched.length === 1 ? "line" : "lines"}</h3><p>Check these names against the catalog. They are left out of the copied list.</p><ul>{analysis.unmatched.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul></div>}
        </> : <p className="deck-empty">Your missing list will appear here after you paste a deck.</p>}
        {copyStatus && <p className="deck-copy-status" role="status">{copyStatus}</p>}
      </div>
    </div>
    <p className="deck-credit">Card names © Riot Games. Full card names via <a href="https://github.com/slimtreble/Riftbound-card-data" target="_blank" rel="noreferrer">Riftbound-card-data</a>.</p>
  </section>;
}
