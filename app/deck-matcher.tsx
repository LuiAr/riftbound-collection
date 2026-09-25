"use client";

import { useMemo, useState } from "react";
import type { DisplayCard } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";

export default function DeckMatcher({ cards, snapshotLabel }: { cards: DisplayCard[]; snapshotLabel: string }) {
  const [deckText, setDeckText] = useState("");
  const [hideRunes, setHideRunes] = useState(true);
  const [hideTokens, setHideTokens] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const analysis = useMemo(() => analyzeDeck(deckText, cards, { hideRunes, hideTokens }), [deckText, cards, hideRunes, hideTokens]);
  const missing = analysis.matches.filter((item) => item.missing > 0);
  const missingText = missingList(analysis.matches);
  const requiredCopies = analysis.matches.reduce((sum, item) => sum + item.required, 0);
  const ownedCopies = analysis.matches.reduce((sum, item) => sum + item.owned, 0);

  async function copyMissing() {
    try {
      await navigator.clipboard.writeText(missingText);
      setCopyStatus("Missing list copied.");
    } catch { setCopyStatus("Copy failed. Select and copy the list below instead."); }
  }

  return <section className="feature-page deck-page" aria-labelledby="deck-title">
    <p className="eyebrow">DECK MATCHER</p><h1 id="deck-title">What am I missing?</h1>
    <p className="feature-intro">Paste a deck list from a website. We’ll compare card names and quantities with your {snapshotLabel}, then make a missing-card list you can copy. Lines such as <strong>3x Card Name</strong>, <strong>3 Card Name</strong>, and <strong>Card Name x3</strong> work.</p>
    <div className="deck-layout">
      <div className="deck-input-panel">
        <label htmlFor="deck-text">Deck list</label>
        <textarea id="deck-text" value={deckText} onChange={(event) => { setDeckText(event.target.value); setCopyStatus(""); }} placeholder={"Main Deck\n3x Card Name\n2x Another Card\n\nRunes\n6x Fury Rune"} spellCheck={false} />
        <p>Paste text, including section headings if the deck site provides them. Cards with different printings match by name.</p>
        <div className="deck-options" role="group" aria-label="Exclude from missing list">
          <label><input type="checkbox" checked={hideRunes} onChange={(event) => setHideRunes(event.target.checked)} /> Hide runes</label>
          <label><input type="checkbox" checked={hideTokens} onChange={(event) => setHideTokens(event.target.checked)} /> Hide tokens</label>
        </div>
      </div>
      <div className="deck-result-panel" aria-live="polite">
        <div className="deck-result-top"><div><h2>Missing cards</h2><p>{snapshotLabel}</p></div><button className="primary-button" type="button" onClick={copyMissing} disabled={!missingText}>Copy missing list</button></div>
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
