"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Sparkles, X } from "lucide-react";
import { assessDeck, builderCards, cardsById, cardIdFor, compatible, eligibleReferences, exportDeck, ownedInventory, references, representativeCard, RULES, strategyProfile, validateDeck, type BuilderInput, type DeckProposal, type FxSnapshot, type ReferenceDeck } from "../lib/deck-builder";
import type { DisplayCard } from "../lib/collection";
import type { PriceSnapshot } from "../lib/prices";
import MissingCardButton from "../components/missing-card-button";

type Generated = { ownedOnly: DeckProposal | null; budget: DeckProposal | null; explanation: string; rejected: string[]; input: BuilderInput; rulesCheckedAt: string; pricesAt: string | null; fx: FxSnapshot; costSek: number; model: string; createdAt: string };
type Status = { enabled: boolean; model: string; capSek: number; spentSek: number; reservedSek: number; month: string; fx: FxSnapshot | null; rulesCheckedAt: string | null; rulesError: string | null; fxError: string | null; history: { id: string; createdAt: string; result: Generated }[] };
const money = (amount: number) => new Intl.NumberFormat("en-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(amount);
const legendLabel = (id: string) => { const c = cardsById.get(id)!; return `${c.tags[0] ?? ""}${c.tags[0] ? ", " : ""}${c.name}`; };
const labels = { legend: "Legend", chosen: "Chosen champion", main: "Main Deck", runes: "Rune Deck", battlefields: "Battlefields", sideboard: "Sideboard" };

export default function DeckBuilder({ cards, prices, onOpenCard }: { cards: DisplayCard[]; prices: PriceSnapshot | null; onOpenCard: (card: DisplayCard) => void }) {
  const [mode, setMode] = useState<"competitive" | "fun">("competitive");
  const [legendId, setLegendId] = useState("rogue assassin");
  const [budget, setBudget] = useState(1000);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [favouriteCodes, setFavouriteCodes] = useState<string[]>([]);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [extraId, setExtraId] = useState("akali deadly weapon");
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [selectedRef, setSelectedRef] = useState("");
  const [notice, setNotice] = useState("");
  const owned = useMemo(() => ownedInventory(cards, extras), [cards, extras]);
  const legends = useMemo(() => builderCards.filter((c) => c.type === "Legend" && (mode === "competitive" || favourites.every((id) => compatible(cardsById.get(id)!, c)))).sort((a, b) => legendLabel(a.id).localeCompare(legendLabel(b.id))), [mode, favourites]);
  const legalRefs = useMemo(() => eligibleReferences(legendId), [legendId]);
  const availableRefs = references.filter((r) => r.legendId === legendId);
  const sortedRefs = useMemo(() => [...legalRefs].sort((a, b) => {
    const left = assessDeck(a.entries, owned, prices, status?.fx ?? null, budget);
    const right = assessDeck(b.entries, owned, prices, status?.fx ?? null, budget);
    return Number(Boolean(b.event)) - Number(Boolean(a.event)) || Number(right.budgetValid) - Number(left.budgetValid) || (a.placement ?? 1000) - (b.placement ?? 1000) || right.lines.reduce((s, l) => s + Math.min(l.required, l.owned), 0) - left.lines.reduce((s, l) => s + Math.min(l.required, l.owned), 0);
  }), [legalRefs, owned, prices, status?.fx, budget]);
  const anchor = sortedRefs.find((r) => r.id === selectedRef) ?? sortedRefs[0];
  const input: BuilderInput = { mode, legendId, favouriteIds: mode === "fun" ? favourites : [], budgetSek: budget, extras };
  const favouritePrintings = cards.filter((card) => card.quantity > 0 && ["Unit", "Spell", "Gear"].includes(cardsById.get(cardIdFor(card) ?? "")?.type ?? "")).sort((a, b) => Number(b.set === "Vendetta") - Number(a.set === "Vendetta") || a.name.localeCompare(b.name));
  const dirty = generated && JSON.stringify(generated.input) !== JSON.stringify(input);

  async function refreshStatus() {
    const response = await fetch("/api/builder", { cache: "no-store" });
    const data = await response.json() as Status & { error?: string };
    if (!response.ok) throw new Error(data.error || "Deck builder status could not be loaded.");
    setStatus(data as Status);
  }
  useEffect(() => { refreshStatus().catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (mode === "fun" && !favourites.length) {
      const diana = favouritePrintings.find((c) => cardIdFor(c) === "diana no longer human");
      if (diana) { setFavourites(["diana no longer human"]); setFavouriteCodes([diana.code]); }
    }
  }, [mode, cards]);
  useEffect(() => {
    if (!legends.some((c) => c.id === legendId) && legends.length) setLegendId(legends.find((c) => eligibleReferences(c.id).length)?.id ?? legends[0].id);
  }, [legends, legendId]);
  async function generate() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as Generated & { error?: string };
      if (!response.ok) throw new Error(data.error || "This build could not be completed.");
      setGenerated(data as Generated);
    } catch (e) { setError(e instanceof Error ? e.message : "The build failed."); }
    finally { setBusy(false); refreshStatus().catch(() => {}); }
  }
  function addFavourite(code: string) {
    const card = cards.find((c) => c.code === code);
    const id = card && cardIdFor(card);
    if (!id || favourites.includes(id) || favourites.length >= 5) return;
    setFavourites([...favourites, id]); setFavouriteCodes([...favouriteCodes, code]);
  }
  async function copy(proposal: DeckProposal) {
    try { await navigator.clipboard.writeText(exportDeck(proposal)); setNotice("Decklist copied."); }
    catch { setNotice("Copy is unavailable in this browser. Use the export text below."); }
  }
  function showDeck(proposal: DeckProposal, title: string, ownedOnly: boolean, isReference = false) {
    const assessment = assessDeck(proposal.entries, owned, prices, status?.fx ?? null, budget);
    const valid = ownedOnly ? assessment.ownedOnlyValid : assessment.budgetValid;
    const refs = references.filter((r) => proposal.referenceIds.includes(r.id));
    const essentialMissing = strategyProfile(refs).filter((p) => p.essential && assessment.lines.some((l) => l.cardId === p.cardId && l.missing));
    return <article className="builder-deck panel" key={title}>
      <div className="builder-deck-head"><div><p className="head-note">{title}</p><h2>{proposal.name}</h2></div><button className="secondary-button" type="button" onClick={() => copy(proposal)}><Copy aria-hidden="true" />Copy</button></div>
      <p className="builder-tag">{isReference ? "Unchanged reference target" : "AI adaptation"} · {assessment.errors.length ? "Legality check failed" : `Passes ${RULES.format} snapshot checks`}</p>
      <p>{proposal.summary}</p>
      <div className="builder-totals"><span><strong>{assessment.lines.reduce((s, l) => s + Math.min(l.required, l.owned), 0)}</strong> confirmed owned</span><span><strong>{assessment.missingCopies}</strong> missing</span><span><strong>{ownedOnly ? money(0) : money(assessment.totalSek)}</strong> {assessment.unpricedCopies && !ownedOnly ? "known subtotal" : "estimated purchases"}</span></div>
      {ownedOnly && assessment.missingCopies > 0 && <p className="builder-warning">This is a target with {assessment.missingCopies} missing copies, not a playable owned-only recommendation. Add unrecorded cards or use AI to assess a coherent alternative.</p>}
      {!ownedOnly && !valid && <p className="builder-warning">{assessment.unpricedCopies ? `${assessment.unpricedCopies} missing copies have no reliable price. The budget cannot be confirmed.` : `${money(assessment.totalSek)} exceeds your ${money(budget)} budget.`}</p>}
      {!isReference && valid && <p className="notice">{ownedOnly ? "All required copies are confirmed owned." : "All missing copies are priced within your card budget. Shipping is excluded."}</p>}
      {essentialMissing.length > 0 && <p className="builder-warning">Essential to this reference strategy: {essentialMissing.map((p) => cardsById.get(p.cardId)!.name).join(", ")}. Movement damage, retreat/ready and Heron cost reduction are engine effects; a cheaper body or generic damage spell does not replace the whole package.</p>}
      {assessment.errors.map((e) => <p className="error-note" key={e}>{e}</p>)}
      {Object.entries(labels).map(([section, label]) => {
        const entries = proposal.entries.filter((e) => e.section === section);
        if (!entries.length) return null;
        return <section className="builder-card-section" key={section}><h3>{label} <span>{entries.reduce((s, e) => s + e.quantity, 0)} cards</span></h3>{entries.map((entry) => {
          const line = assessment.lines.find((l) => l.cardId === entry.cardId)!;
          const card = representativeCard(entry.cardId, cards, favouriteCodes);
          return card ? <div className="builder-card-row" key={entry.cardId}><MissingCardButton card={card} name={cardsById.get(entry.cardId)!.name} detail={`${line.owned} owned · ${line.required} needed across deck · ${line.missing} missing`} count={entry.quantity} onOpen={onOpenCard} /></div> : <p key={entry.cardId}>{entry.quantity} {entry.cardId}</p>;
        })}</section>;
      })}
      {!ownedOnly && <section className="builder-purchases"><h3>Missing-copy shopping list</h3>{assessment.missingCopies ? <div className="builder-table-wrap"><table><thead><tr><th>Card / printing</th><th>Copies</th><th>Each</th><th>Total</th></tr></thead><tbody>{assessment.lines.filter((l) => l.missing).map((l) => <tr key={l.cardId}><td>{cardsById.get(l.cardId)?.name}<small>{l.price ? `${l.price.printingCode}${l.price.printingVerified === false ? " (printing unverified)" : ""} · ${l.price.finish} · Cardmarket #${l.price.productId}` : "Price unavailable"}</small></td><td>{l.missing}</td><td>{l.price ? money(l.price.unitSek) : "Unknown"}</td><td>{l.price ? money(l.price.unitSek * l.missing) : "Unknown"}</td></tr>)}</tbody></table></div> : <p>No purchases required.</p>}<p className="head-note">Cardmarket 7-day sale averages, not seller offers. Lowest reliable estimate across matching playable products and finishes. Exact printing is unverified where the public guide has variants. EU market; seller delivery to Sweden and stock must be checked. Shipping excluded.</p><p className="head-note">Price guide: {prices?.createdAt ?? "unavailable"}. EUR/SEK: {status?.fx ? `${status.fx.eurSek.toFixed(4)} on ${status.fx.date}` : "unavailable"} via <a href="https://frankfurter.dev/v1/" target="_blank" rel="noreferrer">Frankfurter</a>. <a href="https://www.cardmarket.com/en/Riftbound" target="_blank" rel="noreferrer">Check Cardmarket</a></p></section>}
      {proposal.replacements.length > 0 && <section className="builder-replacements"><h3>Replacements and compromises</h3>{proposal.replacements.map((r, i) => <div key={i}><strong>{cardsById.get(r.fromCardId)?.name} → {cardsById.get(r.toCardId)?.name}</strong><p>{r.reason}</p><p className="head-note">{r.compromise}</p></div>)}</section>}
      {proposal.limitations.length > 0 && <section><h3>Limitations</h3><ul>{proposal.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul></section>}
      <section className="builder-sources"><h3>Inspired by</h3>{refs.map((r) => <p key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.name}</a><small>{r.source} · {r.dateKind}: {r.date} · accessed {r.accessedAt}. {r.evidence}.</small></p>)}</section>
      <details><summary>Decklist text</summary><textarea className="deck-textarea" aria-label={`${title} decklist text`} readOnly value={exportDeck(proposal)} /></details>
    </article>;
  }
  const target: DeckProposal | null = anchor ? { name: anchor.name, strategy: anchor.strategy, summary: anchor.strategy === "Akali movement and empower" ? "Build around Akali's movement damage, Shuriken Flip and the Legend's retreat/ready ability. Empower converts those interactions into stronger combat control and repeated scoring pressure. This target preserves a complete source list; inventory overlap alone is not evidence of strategic strength." : `Reference strategy: ${anchor.strategy}. The unchanged source list provides a coherent starting point for adaptation.`, referenceIds: [anchor.id], entries: anchor.entries, replacements: [], limitations: ["Reference results apply to the original list, not to a future adaptation.", "Official English errata has been applied to the card text snapshot. Unusual interactions and event-specific restrictions still need a rules review."] } : null;

  return <section className="feature-page view builder-page">
    <div className="page-head"><div><h1>Deck builder</h1><p className="head-note">A strategy first, then the cards to make it work.</p></div><span className="builder-tag">Standard 1v1 · SEK · Sweden / EU</span></div>
    <div className="builder-controls panel">
      <div className="builder-mode" role="group" aria-label="Deck objective"><button type="button" className={mode === "competitive" ? "active" : ""} onClick={() => { setMode("competitive"); setLegendId("rogue assassin"); setGenerated(null); }}>Competitive</button><button type="button" className={mode === "fun" ? "active" : ""} onClick={() => { setMode("fun"); setGenerated(null); }}>Fun with favourites</button></div>
      <p>{mode === "competitive" ? "Start with Akali and recent tournament lists. Preserve the engine and compare your holdings before buying." : "Choose up to five owned favourites, including special printings, then a compatible Legend. Art and finish never change playable card identity."}</p>
      {mode === "fun" && <div className="builder-favourites"><label className="field-label" htmlFor="builder-favourite">Add an owned favourite</label><select id="builder-favourite" value="" onChange={(e) => addFavourite(e.target.value)}><option value="">Choose a card and printing</option>{favouritePrintings.map((c) => <option value={c.code} key={c.code}>{cardsById.get(cardIdFor(c)!)?.name} · {c.set} {c.number} · {c.quantity} owned</option>)}</select><div className="builder-chips">{favourites.map((id, i) => <button key={id} type="button" onClick={() => { setFavourites(favourites.filter((x) => x !== id)); setFavouriteCodes(favouriteCodes.filter((_, n) => n !== i)); }}>{cardsById.get(id)?.name}<X aria-hidden="true" /></button>)}</div></div>}
      <div className="builder-form-grid"><label><span className="field-label">Champion Legend</span><select value={legendId} onChange={(e) => { setLegendId(e.target.value); setSelectedRef(""); }}>{legends.map((c) => <option key={c.id} value={c.id}>{legendLabel(c.id)}{eligibleReferences(c.id).length ? ` · ${eligibleReferences(c.id).length} references` : " · sources needed"}</option>)}</select></label><label><span className="field-label">Maximum card purchases (SEK)</span><input type="number" min="0" max="100000" step="50" value={budget} onChange={(e) => setBudget(Math.max(0, Math.min(100000, Number(e.target.value))))} /></label></div>
      <details className="builder-inventory"><summary>My inventory is incomplete: add temporary copies</summary><p>These additions apply only to this build. Your saved collection stays as imported. Enter extra copies beyond your recorded total, including runes and battlefields.</p><div className="builder-extra-form"><label><span className="field-label">Card</span><select value={extraId} onChange={(e) => setExtraId(e.target.value)}>{builderCards.filter((c) => c.type !== "Token").sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name} ({owned[c.id] ?? 0} confirmed)</option>)}</select></label><label><span className="field-label">Extra copies</span><input type="number" value={extraQuantity} min="1" max="1000" onChange={(e) => setExtraQuantity(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value)) || 1)))} /></label><button type="button" className="secondary-button" onClick={() => setExtras({ ...extras, [extraId]: (extras[extraId] ?? 0) + extraQuantity })}><Plus aria-hidden="true" />Add</button></div><div className="builder-chips">{Object.entries(extras).map(([id, count]) => <button type="button" key={id} onClick={() => { const next = { ...extras }; delete next[id]; setExtras(next); }}>{cardsById.get(id)?.name} +{count}<X aria-hidden="true" /></button>)}</div></details>
      <div className="builder-generate"><button className="primary-button" type="button" onClick={generate} disabled={busy || !status?.enabled || !status.rulesCheckedAt || !status.fx || !legalRefs.length || (mode === "fun" && !favourites.length)} aria-busy={busy}><Sparkles aria-hidden="true" />{busy ? "Assessing strategy…" : "Build both versions"}</button><p className="head-note">{status ? `${money(status.spentSek)} used · ${money(status.reservedSek)} reserved · ${money(status.capSek)} monthly limit (${status.month} UTC).` : "Loading AI allowance…"} Maximum reservation per build: 10 SEK. AI allowance uses published token rates, excluding taxes and payment fees. Simple inventory and budget checks use no AI tokens.</p></div>
      {status && !status.enabled && <p className="builder-warning">AI setup required: connect a separately billed OpenAI API key securely to this website. Your ChatGPT subscription does not supply API credits. Reference comparisons below work now; strategic replacements require the AI connection.</p>}
      {status?.reservedSek ? <p className="head-note">Reservations cover in-progress requests and requests whose billed usage could not be confirmed. Uncertain usage stays reserved to protect your monthly limit.</p> : null}
      {status?.rulesError && <p className="builder-warning">{status.rulesError}</p>}{status?.fxError && <p className="builder-warning">{status.fxError}</p>}
      {error && <p className="error-note" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    </div>
    <section className="builder-reference-panel panel"><h2>Strategy and reference evidence</h2><p>{legalRefs.length} legal reference {legalRefs.length === 1 ? "list" : "lists"} in this source snapshot. {availableRefs.length - legalRefs.length > 0 ? `${availableRefs.length - legalRefs.length} excluded by current snapshot checks.` : ""} Sources accessed 3 October 2026. {legalRefs.length < 10 ? "Fewer than 10 lists: evidence is limited for this Legend." : ""}</p>{[...new Set(legalRefs.map((r) => r.strategy))].map((strategy) => <div key={strategy}><h3>{strategy}</h3><p>{strategy === "Akali movement and empower" ? "Engine: Akali, Deadly Weapon + Shuriken Flip + Astral Heron + retreat/ready. Protect movement and empower interactions. Other recurrent cards can be flexible only after their role and curve are assessed." : "A separate source strategy; its slots should be assessed together."}</p><details><summary>Recurring cards and flexible slots</summary><ul className="builder-frequency">{strategyProfile(legalRefs.filter((r) => r.strategy === strategy)).sort((a, b) => b.decks - a.decks).map((p) => <li key={p.cardId}><strong>{cardsById.get(p.cardId)?.name}</strong><span>{p.decks}/{p.total} lists · median {p.medianCopies} · {p.essential ? "essential engine card" : "role review required"}</span></li>)}</ul><p className="head-note">Frequency is evidence of inclusion, not proof a card is essential or interchangeable.</p></details></div>)}{legalRefs.length > 0 && <label><span className="field-label">Reference target</span><select value={anchor?.id ?? ""} onChange={(e) => setSelectedRef(e.target.value)}>{sortedRefs.map((r) => <option value={r.id} key={r.id}>{r.name} · {r.date} · {r.source}</option>)}</select></label>}{availableRefs.filter((r) => validateDeck(r.entries).length).map((r) => <details key={r.id}><summary>Excluded: {r.name}</summary><p>{validateDeck(r.entries).join(" ")}</p><a href={r.url} target="_blank" rel="noreferrer">Original source</a></details>)}{!legalRefs.length && <p className="builder-warning">No legal reference list is available for this Legend yet. Choose a Legend with references. Shared deck sources have no verified public import API; this version uses dated, curated public lists.</p>}</section>
    {generated && <section className="builder-results"><h2>Your strategy comparison</h2><p>{generated.explanation}</p><p className="head-note">Generated {new Date(generated.createdAt).toLocaleString()} with {generated.model}. AI charge estimate {money(generated.costSek)}. Rules checked {new Date(generated.rulesCheckedAt).toLocaleString()}.</p>{dirty && <p className="builder-warning">Your options changed since this build. Counts and costs below use current holdings and prices; rebuild before treating it as your requested recommendation.</p>}<div className="builder-comparison">{generated.ownedOnly ? showDeck(generated.ownedOnly, "Owned only", true) : <article className="panel builder-deck"><h2>Owned only</h2><p>No coherent validated owned-only proposal was accepted. Review the explanation and confirm unrecorded copies before rebuilding.</p></article>}{generated.budget ? showDeck(generated.budget, "With purchase budget", false) : <article className="panel builder-deck"><h2>With purchase budget</h2><p>No fully priced, validated proposal within budget was accepted. Review essential cards and missing prices before rebuilding.</p></article>}</div>{generated.rejected.length > 0 && <details><summary>Validation rejected a proposal</summary>{generated.rejected.map((r) => <p key={r}>{r}</p>)}</details>}</section>}
    {target && <section className="builder-results"><h2>{generated ? "Original reference comparison" : "Compare the reference with your collection"}</h2><p>Keep the successful source deck intact while checking what you can actually assemble. AI adaptations appear separately after generation.</p><div className="builder-comparison">{showDeck(target, "Owned-only feasibility", true, true)}{showDeck(target, "Reference purchase estimate", false, true)}</div></section>}
    {status?.history.length ? <section className="panel builder-history"><h2>Recent saved builds</h2><p>Previous AI builds are saved to your account. Loading one rechecks counts against your current collection.</p>{status.history.map((item) => <button type="button" className="secondary-button" key={item.id} onClick={() => { setMode(item.result.input.mode); setLegendId(item.result.input.legendId); setBudget(item.result.input.budgetSek); setFavourites(item.result.input.favouriteIds); setExtras(item.result.input.extras); setGenerated(item.result); }}>{item.result.budget?.name ?? item.result.ownedOnly?.name ?? "Build assessment"} · {new Date(item.createdAt).toLocaleDateString()}</button>)}</section> : null}
    <p className="builder-footer head-note"><a href={RULES.source} target="_blank" rel="noreferrer">Official rules and restrictions</a> · snapshot checked {RULES.checkedAt}, bans effective {RULES.effectiveAt}. {status?.rulesCheckedAt ? "Live source confirmed this session." : "Current live verification unavailable; snapshot checks only."} Event-specific restrictions and unusual card exceptions require a separate review. Card text and art © Riot Games, with <a href="https://github.com/slimtreble/Riftbound-card-data" target="_blank" rel="noreferrer">Riot-derived card metadata</a>. Deck references are linked to their original publishers.</p>
  </section>;
}
