"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Plus, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { assessDeck, builderCards, cardsById, cardIdFor, compatible, exportDeck, ownedInventory, references, representativeCard, RULES, type DeckProposal, type FxSnapshot } from "../lib/deck-builder";
import { activeJob, type BuilderJob } from "../lib/builder-jobs";
import { readBuilderDeck } from "../lib/saved-builder-deck";
import type { SavedDeck } from "../lib/deck-records";
import { listDecks, saveLocalDeck } from "../lib/local-decks";
import { runAdvisor } from "../lib/advisor-actions";
import { useStaticSite } from "./static-context";
import type { DisplayCard } from "../lib/collection";
import type { PriceSnapshot } from "../lib/prices";
import MissingCardButton from "../components/missing-card-button";
import DeckAdviser from "../components/deck-adviser";
import type { collectionCandidates } from "../lib/deck-advisor";
import FavouriteCardPicker, { preferredFavouritePrinting } from "../components/favourite-card-picker";
import { BUILD_STEPS, type BuildStage } from "../lib/builder-progress";
import { qualityChecks, referenceEvidence, selectReferences } from "../lib/deck-quality";

type Generated = NonNullable<BuilderJob["result"]>;
type Status = { enabled: boolean; model: string; capSek: number; spentSek: number; reservedSek: number; month: string; jobs: BuilderJob[]; nextCursor: string | null; fx: FxSnapshot | null; rulesCheckedAt: string | null; rulesError: string | null; fxError: string | null; history: { id: string; createdAt: string; result: Generated }[] };
type OpenDeck = { proposal: DeckProposal; result: Generated | null; deckId?: string; jobId?: string; extraCounts?: Record<string, number> };
const money = (amount: number) => new Intl.NumberFormat("en-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(amount);
const legendLabel = (id: string) => { const c = cardsById.get(id)!; return `${c.tags[0] ?? ""}${c.tags[0] ? ", " : ""}${c.name}`; };
const labels = { legend: "Legend", chosen: "Chosen champion", main: "Main deck", runes: "Runes", battlefields: "Battlefields", sideboard: "Sideboard" };

export default function DeckBuilder({ cards, prices, onOpenCard }: { cards: DisplayCard[]; prices: PriceSnapshot | null; onOpenCard: (card: DisplayCard) => void }) {
  const site = useStaticSite();
  const [mode, setMode] = useState<"competitive" | "fun">("competitive");
  const [legendId, setLegendId] = useState("rogue assassin");
  const [allowPurchases, setAllowPurchases] = useState(true);
  const [budget, setBudget] = useState(1000);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [favouriteCodes, setFavouriteCodes] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [extraId, setExtraId] = useState("akali deadly weapon");
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [status, setStatus] = useState<Status | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [savedError, setSavedError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const searchKey = JSON.stringify({ legendId, budget, allowPurchases, mode, favourites, extras });
  const [candidateResult, setCandidateResult] = useState<{ key: string; candidates: ReturnType<typeof collectionCandidates> } | null>(null);
  const candidates = candidateResult?.key === searchKey ? candidateResult.candidates : [];
  const setCandidates = (items: ReturnType<typeof collectionCandidates>) => setCandidateResult({ key: searchKey, candidates: items });
  const [buildStage, setBuildStage] = useState<BuildStage | null>(null);
  const [buildState, setBuildState] = useState<"running" | "complete" | "failed">("running");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const autoOpened = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openDeck, setOpenDeck] = useState<OpenDeck | null>(null);
  const [failureDetails, setFailureDetails] = useState<Generated | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewTab, setReviewTab] = useState("cards");
  const owned = useMemo(() => ownedInventory(cards, extras), [cards, extras]);
  const deckOwned = useMemo(() => ownedInventory(cards, openDeck?.extraCounts ?? openDeck?.result?.input.extras ?? {}), [cards, openDeck]);
  const legends = useMemo(() => builderCards.filter((c) => c.type === "Legend" && selectReferences(c.id).length && (mode === "competitive" || favourites.every((id) => compatible(cardsById.get(id)!, c)))).sort((a, b) => legendLabel(a.id).localeCompare(legendLabel(b.id))), [mode, favourites]);
  const preferredPrintings = favourites.map((id) => favouriteCodes[id] ?? preferredFavouritePrinting(cards, id)).filter((code): code is string => Boolean(code));
  const saved = savedDecks.map((deck) => ({ deck, proposal: readBuilderDeck(deck.name, deck.deckText) })).filter((item) => item.proposal !== null);
  const proposal = openDeck?.proposal;
  const selectedReferences = selectReferences(legendId);
  const coverage = referenceEvidence(selectedReferences);
  const quality = proposal ? openDeck?.result?.quality?.[proposal === openDeck.result.ownedOnly ? "ownedOnly" : "budget"] ?? qualityChecks(proposal, references) : null;
  const strategyFits = openDeck?.result?.feasibility?.fits.filter((fit) => proposal?.referenceIds.includes(fit.referenceId)) ?? [];
  const percentage = (value: number | null) => value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
  const assessment = proposal ? assessDeck(proposal.entries, deckOwned, prices, status?.fx ?? null, openDeck?.result?.input.budgetSek ?? budget) : null;
  const unavailable = legendId === "any" ? "AI needs a champion. Free search can compare all owned champions." : !status ? "Getting ready…" : !status.enabled ? "Paid AI generation is not part of this static site. Find collection decks still runs in the browser." : status.rulesError ? "Generation is paused until current rules can be verified." : status.fxError ? "Generation is paused until prices can be converted to SEK." : !legends.length ? "No reference decks match these favourites yet." : mode === "fun" && !favourites.length ? "Choose a favourite card in More options." : "";

  useEffect(() => {
    setStatus({
      enabled: false,
      model: "unavailable",
      capSek: 0,
      spentSek: 0,
      reservedSek: 0,
      month: new Date().toISOString().slice(0, 7),
      jobs: [],
      nextCursor: null,
      fx: site.market.fx,
      rulesCheckedAt: site.market.rulesCheckedAt,
      rulesError: site.market.rulesError,
      fxError: site.market.fxError,
      history: [],
    });
    try { setSavedDecks(listDecks()); setSavedError(""); }
    catch (e) { setSavedError(e instanceof Error ? e.message : "Saved decks could not be loaded."); }
  }, [site]);
  useEffect(() => {
    if (legendId !== "any" && !legends.some((c) => c.id === legendId) && legends.length) setLegendId(legends[0].id);
  }, [legends, legendId]);
  function open(proposal: DeckProposal, result: Generated | null, deckId?: string, jobId?: string, extraCounts?: Record<string, number>) {
    setOpenDeck({ proposal, result, deckId, jobId, extraCounts }); setName(proposal.name.slice(0, 80)); setNotice(""); setError(""); setFailureDetails(null);
    setReviewTab("cards");
  }
  function chooseFavourite(card: DisplayCard) {
    const id = cardIdFor(card);
    if (!id) return;
    if (favourites.includes(id) && (favouriteCodes[id] ?? preferredFavouritePrinting(cards, id)) === card.code) {
      setFavourites(favourites.filter((item) => item !== id));
      const next = { ...favouriteCodes }; delete next[id]; setFavouriteCodes(next);
    } else if (favourites.includes(id) || favourites.length < 5) {
      if (!favourites.includes(id)) setFavourites([...favourites, id]);
      setFavouriteCodes({ ...favouriteCodes, [id]: card.code });
    }
  }
  const hasActiveJobs = status?.jobs.some(activeJob) ?? false;
  useEffect(() => {
    if (!status) return;
    const job = currentJobId ? status.jobs.find((item) => item.id === currentJobId) : status.jobs.find(activeJob) ?? status.jobs.find((item) => item.status === "completed");
    if (!job) return;
    if (!currentJobId) setCurrentJobId(job.id);
    setBuildStage(job.stage);
    if (activeJob(job)) { setBusy(true); setBuildState("running"); return; }
    setBusy(false);
    setBuildState(job.status === "completed" ? "complete" : "failed");
    if (autoOpened.current === job.id) return;
    autoOpened.current = job.id;
    if (job.result) {
      const preferred = job.result.recommendation ? job.result[job.result.recommendation] : null;
      const selected = preferred ?? (job.result.input.budgetSek ? job.result.budget ?? job.result.ownedOnly : job.result.ownedOnly);
      if (selected) open(selected, job.result, undefined, job.id);
      else { setOpenDeck(null); setFailureDetails(job.result); setError(job.result.explanation || "No proposed deck passed validation. Review the retained output below."); }
    } else if (job.error) setError(job.error);
  }, [status, currentJobId]);
  async function findCollectionDecks() {
    setFinding(true); setError(""); setCandidates([]);
    try {
      const response = await runAdvisor({ action: "build", legendId, extras, budget: allowPurchases ? budget : 0, favouriteIds: mode === "fun" ? favourites : [] }, site.advisorContext());
      if (!response.ok) throw new Error(response.error);
      const result = response.data as { candidates?: ReturnType<typeof collectionCandidates>; warnings?: string[]; runeCoverage?: { legendId: string; copies: number }[] };
      if (!result.candidates) throw new Error("Collection search could not be completed.");
      setCandidates(result.candidates);
      setNotice(result.candidates.length ? `${result.candidates.length} decks found. Adapted lists need playtesting.` : result.runeCoverage?.every(c => c.copies < 12) ? "Not enough recorded runes. Add copies in More options or allow purchases." : "No matching deck found. Try another champion or budget.");
      if (result.warnings?.length) setError(result.warnings.join(" "));
    } catch (e) { setError(e instanceof Error ? e.message : "Try again later."); }
    finally { setFinding(false); }
  }
  async function generate() {
    setError("Paid AI generation needs a server and an API key, so it is not available on this static site. Use Find collection decks.");
    setBuildState("failed");
  }
  async function removeGeneration(id: string) {
    setDeleting(id); setError("");
    try {
      setStatus((current) => current ? { ...current, jobs: current.jobs.filter((job) => job.id !== id) } : current);
      if (currentJobId === id) { setCurrentJobId(null); setBuildStage(null); setFailureDetails(null); }
      if (openDeck?.jobId === id) setOpenDeck(null);
      setNotice("Generation deleted.");
    } catch (e) { setError(e instanceof Error ? e.message : "Generation could not be deleted."); }
    finally { setDeleting(null); }
  }
  async function save() {
    if (!proposal || !name.trim() || assessment?.errors.length) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const deck = saveLocalDeck({ deckId: openDeck?.deckId, name: name.trim(), deckText: exportDeck(proposal), hideRunes: false, hideTokens: false });
      setOpenDeck((current) => current ? { ...current, deckId: deck.deckId, jobId: undefined, proposal: { ...current.proposal, name: deck.name } } : current);
      setSavedDecks(listDecks());
      if (openDeck?.jobId) {
        const keptId = openDeck.jobId;
        setStatus((current) => current ? { ...current, jobs: current.jobs.filter((job) => job.id !== keptId) } : current);
        setCurrentJobId(null);
      }
      setNotice("Deck saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "The deck could not be saved. Try again."); }
    finally { setSaving(false); }
  }
  async function copy() {
    if (!proposal) return;
    try { await navigator.clipboard.writeText(exportDeck(proposal)); setNotice("Decklist copied."); }
    catch { setError("Copy is unavailable. Open Details to copy the decklist text."); }
  }

  return <section className="feature-page view builder-page builder-simple">
    <div className="page-head"><h1>Deck builder</h1></div>
    <div className="builder-controls panel">
      <div className="builder-simple-form">
        <label><span className="field-label">Champion</span><select value={legendId} disabled={busy || finding} onChange={(e) => { setLegendId(e.target.value); setCandidates([]); }}><option value="any">Any owned champion</option>{legends.map((c) => <option key={c.id} value={c.id}>{legendLabel(c.id)}</option>)}</select></label>
        <div><span className="field-label">Cards to use</span><div className="builder-mode builder-card-source" role="group" aria-label="Cards to use"><button type="button" className={!allowPurchases ? "active" : ""} aria-pressed={!allowPurchases} disabled={busy || finding} onClick={() => setAllowPurchases(false)}>Owned only</button><button type="button" className={allowPurchases ? "active" : ""} aria-pressed={allowPurchases} disabled={busy || finding} onClick={() => setAllowPurchases(true)}>Add purchases</button></div></div>
        {allowPurchases && <label><span className="field-label">Budget (SEK)</span><input type="number" min="0" max="100000" step="50" value={budget} disabled={busy || finding} onChange={(e) => setBudget(Math.max(0, Math.min(100000, Number(e.target.value))))} /></label>}
      </div>
      <div className="builder-actions"><button className="primary-button builder-main-action" type="button" onClick={generate} disabled={busy || saving || finding || Boolean(unavailable) || !status?.rulesCheckedAt || !status?.fx} aria-busy={busy}><Sparkles aria-hidden="true" />{busy ? "Generating…" : "Generate deck"}</button>
      <button className="secondary-button builder-main-action" type="button" onClick={findCollectionDecks} disabled={busy || saving || finding} aria-busy={finding}><Search aria-hidden="true" />{finding ? "Searching…" : "Find collection decks"}<span className="action-tag">Free</span></button></div>
      {candidates.length > 0 && <div className="collection-candidates">{candidates.map((candidate, i) => <div key={i}><button className="secondary-button" type="button" onClick={() => open(candidate.deck, null, undefined, undefined, extras)}><strong>{i + 1}. {legendLabel(candidate.deck.entries.find(e => e.section === "legend")!.cardId)} · {candidate.deck.strategy}</strong><span>{money(candidate.assessment.totalSek)} · {candidate.assessment.missingCopies} to buy</span></button><p className="head-note">{candidate.analysis.engine.length ? candidate.analysis.engineDeficit ? `${candidate.analysis.engineDeficit} reviewed engine copies missing` : "Reviewed engine quantities covered" : "Engine needs strategic review"} · needs playtesting.</p></div>)}</div>}
      {(busy || (buildStage && buildState === "failed")) && <div className="builder-progress" aria-busy={busy}>
        <div className="builder-progress-heading"><strong>{buildState === "complete" ? "Your deck is ready" : buildState === "failed" ? "Generation stopped" : "Making your deck"}</strong><span role="status" aria-live="polite">{buildState === "complete" ? "All checks completed" : buildState === "failed" ? "See the message below" : buildStage ? BUILD_STEPS.find((step) => step.id === buildStage)?.title : "Connecting…"}</span></div>
        <ol>{BUILD_STEPS.map((step, index) => {
          const current = BUILD_STEPS.findIndex((item) => item.id === buildStage);
          const done = buildState === "complete" || index < current;
          const active = index === current && buildState !== "complete";
          return <li className={done ? "done" : active ? buildState === "failed" ? "failed" : "active" : "pending"} key={step.id} aria-current={active ? "step" : undefined}><span className="builder-step-icon">{done ? <Check aria-hidden="true" /> : active && buildState === "running" ? <LoaderCircle aria-hidden="true" /> : active && buildState === "failed" ? <X aria-hidden="true" /> : index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p><span className="visually-hidden">{done ? "Completed" : active ? buildState === "failed" ? "Stopped" : "In progress" : "Waiting"}</span></div></li>;
        })}</ol>
        {busy && buildStage === "build" && <p className="builder-progress-wait">You can close this page and return later.</p>}
      </div>}
      {!busy && buildState === "complete" && <div className="builder-generated" role="status"><Check aria-hidden="true" />Deck ready to review.</div>}
      {unavailable && <p className="head-note">{unavailable}</p>}
      <details className="builder-options"><summary>More options</summary>
        <p className="head-note">Free search compares saved reference decks. All printings count toward ownership. Temporary additions apply to this build only.</p>
        <label><span className="field-label">Deck style</span><select value={mode} disabled={busy} onChange={(e) => { const next = e.target.value as "competitive" | "fun"; setMode(next); if (next === "fun" && !favourites.length && owned["diana no longer human"] > 0) setFavourites(["diana no longer human"]); }}><option value="competitive">Competitive</option><option value="fun">Fun with favourites</option></select></label>
        {mode === "fun" && <div><FavouriteCardPicker cards={cards} selected={favourites} printingCodes={favouriteCodes} disabled={busy} onSelect={chooseFavourite} /><div className="builder-chips">{favourites.map((id) => <button disabled={busy} key={id} type="button" onClick={() => setFavourites(favourites.filter((x) => x !== id))}>{cardsById.get(id)?.name}<X aria-hidden="true" /></button>)}</div></div>}
        <details><summary>Add cards I haven’t imported yet</summary><p className="head-note">Extra copies for this build only. Your collection may be incomplete.</p><div className="builder-extra-form"><label><span className="field-label">Card</span><select value={extraId} disabled={busy} onChange={(e) => setExtraId(e.target.value)}>{builderCards.filter((c) => c.type !== "Token").sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span className="field-label">Extra copies</span><input type="number" disabled={busy} value={extraQuantity} min="1" max="1000" onChange={(e) => setExtraQuantity(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value)) || 1)))} /></label><button type="button" disabled={busy} className="secondary-button" onClick={() => setExtras({ ...extras, [extraId]: Math.min(1000, (extras[extraId] ?? 0) + extraQuantity) })}><Plus aria-hidden="true" />Add</button></div><div className="builder-chips">{Object.entries(extras).map(([id, count]) => <button disabled={busy} type="button" key={id} onClick={() => { const next = { ...extras }; delete next[id]; setExtras(next); }}>{cardsById.get(id)?.name} +{count}<X aria-hidden="true" /></button>)}</div></details>
        {status?.enabled && <p className="head-note">AI usage: {money(status.spentSek)} of {money(status.capSek)} this month{status.reservedSek ? ` · ${money(status.reservedSek)} reserved` : ""}. Up to 10 SEK reserved per generation, excluding taxes and fees.</p>}
        {(status?.rulesError || status?.fxError) && <p className="head-note">{status.rulesError ?? status.fxError}</p>}
        <details><summary>Reference coverage for this champion</summary><p className="head-note">{coverage.references} full lists · {coverage.independentMainLists} distinct main lists · {coverage.official} official event lists. {coverage.label}.</p>{coverage.warnings.map((warning) => <p className="head-note" key={warning}>{warning}</p>)}</details>
      </details>
    </div>
    {error && <p className="error-note" role="alert">{error}</p>}
    {failureDetails && <details className="panel builder-failure"><summary>Why no deck was generated</summary><p>{failureDetails.explanation}</p>{failureDetails.rejected.map((r) => <p key={r}>{r}</p>)}</details>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {proposal && assessment && <article className="builder-deck panel">
      <div className="builder-save-bar"><label><span className="field-label">Your deck</span><input aria-label="Deck name" maxLength={80} value={name} disabled={saving || busy} onChange={(e) => setName(e.target.value)} /></label><button className="primary-button" type="button" onClick={save} disabled={saving || busy || !name.trim() || Boolean(assessment.errors.length)} aria-busy={saving}><Save aria-hidden="true" />{saving ? "Saving…" : "Save deck"}</button></div>
      {openDeck?.result?.ownedOnly && openDeck.result.budget && <div className="builder-mode" role="group" aria-label="Deck version"><button disabled={busy || saving} type="button" className={proposal.entries === openDeck.result.ownedOnly.entries ? "active" : ""} onClick={() => open(openDeck.result!.ownedOnly!, openDeck.result, undefined, openDeck.jobId)}>Owned only</button><button disabled={busy || saving} type="button" className={proposal.entries === openDeck.result.budget.entries ? "active" : ""} onClick={() => open(openDeck.result!.budget!, openDeck.result, undefined, openDeck.jobId)}>With purchases</button></div>}
      <div className="review-coverage"><div><span>Collection coverage</span><strong>{assessment.lines.reduce((sum, line) => sum + Math.min(line.required, line.owned), 0)}/{assessment.lines.reduce((sum, line) => sum + line.required, 0)} copies</strong></div><progress aria-label="Owned copies in this deck" value={assessment.lines.reduce((sum, line) => sum + Math.min(line.required, line.owned), 0)} max={assessment.lines.reduce((sum, line) => sum + line.required, 0) || 1} /></div>
      <div className="builder-totals"><span><strong>{assessment.lines.reduce((sum, line) => sum + Math.min(line.required, line.owned), 0)}</strong>Owned</span><span><strong>{assessment.missingCopies}</strong>Missing</span><span><strong>{assessment.unpricedCopies ? `${money(assessment.totalSek)} + ?` : money(assessment.totalSek)}</strong>Purchases · excl. shipping</span></div>
      {assessment.errors.length > 0 && <p className="builder-warning">This saved deck needs a rules update before it can be saved again. See Details.</p>}
      {assessment.unpricedCopies > 0 && <p className="head-note">{assessment.unpricedCopies} missing copies have no price yet.</p>}
      {openDeck.result && assessment.totalSek > openDeck.result.input.budgetSek && <p className="head-note">Current prices exceed this build’s budget. See Details.</p>}
      <Tabs className="deck-review-tabs" value={reviewTab} onValueChange={setReviewTab}>
      <TabsList aria-label="Deck review"><TabsTrigger value="cards">Cards</TabsTrigger><TabsTrigger value="improve">Review & upgrades</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
      <TabsContent value="cards"><div className="builder-card-list">{Object.entries(labels).map(([section, label]) => {
        const entries = proposal.entries.filter((e) => e.section === section);
        if (!entries.length) return null;
        return <section className="builder-card-section" key={section}><h3>{label}<span>{entries.reduce((sum, e) => sum + e.quantity, 0)} cards</span></h3><div className="builder-card-grid">{entries.map((entry) => {
          const line = assessment.lines.find((l) => l.cardId === entry.cardId)!;
          const card = representativeCard(entry.cardId, cards, preferredPrintings);
          return card ? <div className="builder-card-row" key={entry.cardId}><MissingCardButton card={card} name={cardsById.get(entry.cardId)!.name} detail={line.missing ? `Own ${Math.min(line.owned, line.required)}/${line.required} · need ${line.missing}` : "All copies owned"} count={entry.quantity} countLabel="deck copies" onOpen={onOpenCard} /></div> : <p key={entry.cardId}>{entry.quantity} {cardsById.get(entry.cardId)?.name ?? entry.cardId}</p>;
        })}</div></section>;
      })}</div></TabsContent>
      <TabsContent value="improve" forceMount hidden={reviewTab !== "improve"}><DeckAdviser name={name} deckText={exportDeck(proposal)} deckId={openDeck?.deckId} extras={openDeck?.extraCounts ?? openDeck?.result?.input.extras} onApply={text => { const updated = readBuilderDeck(name, text); if (updated) { open(updated, null, openDeck?.deckId, undefined, openDeck?.extraCounts ?? openDeck?.result?.input.extras); setNotice("Upgrade applied. Save to keep this version."); } }} /></TabsContent>
      <TabsContent value="details">
      <details className="builder-details"><summary>Details: purchases, strategy & sources</summary>
        {proposal.summary && <p>{proposal.summary}</p>}
        {openDeck?.result?.rankingMethod && <p className="head-note">{openDeck.result.rankingMethod}</p>}
        {quality && <details className="builder-quality"><summary>Evidence &amp; consistency checks</summary><p><strong>{quality.evidence.label}</strong>. This generated deck has not been competitively tested.</p><p className="head-note">{quality.evidence.references} reference lists · {quality.evidence.independentMainLists} distinct main lists · {quality.evidence.resultEvents} named events.</p>
          {strategyFits.length > 0 && <details><summary>Why this strategy fits your collection</summary>{strategyFits.map((fit) => <div key={fit.referenceId}><p><strong>{fit.strategy}</strong> · {fit.reviewedCore ? "Reviewed core quantities" : "Core needs review"}.</p><p className="head-note">At generation: full reference purchases {money(fit.fullReference.knownCostSek)}{fit.fullReference.unpricedCopies ? " + unpriced copies" : ""}{fit.reviewedCore ? ` · core purchases ${money(fit.referenceCore.knownCostSek)}${fit.referenceCore.unpricedCopies ? " + unpriced copies" : ""}` : ""}. Shipping excluded.</p>{fit.reviewedCore && fit.referenceCore.missing.length > 0 && <p className="head-note">Core gaps: {fit.referenceCore.missing.map((line) => `${line.missing} × ${cardsById.get(line.cardId)?.name ?? line.cardId}`).join(" · ")}.</p>}{fit.favouriteIdsNotInReference.length > 0 && <p className="head-note">Your favourites require changes to this reference.</p>}</div>)}<p className="head-note">Core costs cover the annotated engine, Legend, chosen champion and favourites. Remaining slots still need fitting. Full-reference costs include its sideboard. These are starting-point costs, not the generated deck&apos;s purchase total or a strength rating.</p></details>}
          {quality.engine.length > 0 && <div className="builder-table-wrap"><table><thead><tr><th>Key card</th><th>Drawn copies</th><th>Access in {quality.seen} cards</th><th>Reference access</th></tr></thead><tbody>{quality.engine.map((card) => <tr key={card.cardId}><td>{cardsById.get(card.cardId)?.name}<small>{card.role}</small></td><td>{card.copies}{card.chosen ? " + chosen" : ""}</td><td>{card.chosen ? "Chosen available separately" : percentage(card.access)}</td><td>{percentage(card.referenceAccess)}</td></tr>)}</tbody></table></div>}
          <p className="head-note">{quality.earlyUnits} drawn units with printed Energy 0–2 · chance of seeing one in {quality.seen} cards: {percentage(quality.earlyUnitAccess)}. {quality.highCost} drawn cards cost 6+ printed Energy.</p><p className="head-note">Printed Energy curve: {Object.entries(quality.energyCurve).map(([energy, copies]) => `${energy}: ${copies}`).join(" · ")}. Chosen champion excluded.</p>
          {quality.benchmarkId && <p className="head-note">Quantity comparison: {references.find((ref) => ref.id === quality.benchmarkId)?.name ?? quality.benchmarkId}.</p>}
          {[...quality.evidence.warnings, ...quality.warnings].map((warning) => <p className="head-note" key={warning}>{warning}</p>)}<p className="head-note">{quality.assumptions}</p>
        </details>}
        {assessment.missingCopies > 0 && <section className="builder-purchases"><h3>Suggested purchases</h3><div className="builder-table-wrap"><table><thead><tr><th>Card / printing</th><th>Missing</th><th>Each</th><th>Total</th></tr></thead><tbody>{assessment.lines.filter((l) => l.missing).map((l) => <tr key={l.cardId}><td>{cardsById.get(l.cardId)?.name}<small>{l.price ? `${l.price.printingCode} · ${l.price.finish}${l.price.printingVerified === false ? " · printing unverified" : ""} · Cardmarket #${l.price.productId}` : "Price unavailable"}</small></td><td>{l.missing}</td><td>{l.price ? money(l.price.unitSek) : "Unknown"}</td><td>{l.price ? money(l.price.unitSek * l.missing) : "Unknown"}</td></tr>)}</tbody></table></div></section>}
        <p className="head-note">Cardmarket 7-day sale averages for affordable playable products, not seller offers. EU prices; shipping excluded. Stock and delivery to Sweden need checking. Prices: {prices?.createdAt ?? "unavailable"}. EUR/SEK: {status?.fx ? `${status.fx.eurSek} on ${status.fx.date}` : "unavailable"} via <a href="https://frankfurter.dev/v1/" target="_blank" rel="noreferrer">Frankfurter</a>.</p>
        {proposal.replacements.length > 0 && <section className="builder-replacements"><h3>Replacements</h3>{proposal.replacements.map((r, i) => <div key={i}><strong>{cardsById.get(r.fromCardId)?.name} → {cardsById.get(r.toCardId)?.name}</strong><p>{r.reason} {r.compromise}</p></div>)}</section>}
        {proposal.limitations.map((l, i) => <p key={i}>{l}</p>)}
        {references.filter((r) => proposal.referenceIds.includes(r.id)).map((r) => <p key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.name}</a><small className="head-note"> · {r.source} · {r.dateKind}: {r.date} · accessed {r.accessedAt}. {r.evidence}.{r.updatedLabel ? ` Updated ${r.updatedLabel} when collected; exact date unavailable.` : ""}{r.placement ? ` Overall placement: #${r.placement}.` : ""}</small></p>)}
        {openDeck.result && <p className="head-note">Generated {new Date(openDeck.result.createdAt).toLocaleString()} · {openDeck.result.model} · estimated AI cost {money(openDeck.result.costSek)}. Rules checked {new Date(openDeck.result.rulesCheckedAt).toLocaleString()}. {openDeck.result.explanation}</p>}
        {openDeck.result && Object.keys(openDeck.result.input.extras).length > 0 && <p className="head-note">Owned counts include temporary extra copies from this build. Saved decks use your imported collection when reopened.</p>}
        {assessment.errors.map((e) => <p className="error-note" key={e}>{e}</p>)}
        <p className="head-note"><a href={RULES.source} target="_blank" rel="noreferrer">Official rules</a> · {RULES.format} snapshot {RULES.checkedAt}. Event-specific exceptions require review. Card text and art © Riot Games, with <a href="https://github.com/slimtreble/Riftbound-card-data" target="_blank" rel="noreferrer">Riot-derived metadata</a>.</p>
        <button className="secondary-button" type="button" onClick={copy}><Copy aria-hidden="true" />Copy decklist</button><textarea className="deck-textarea" aria-label="Decklist text" readOnly value={exportDeck(proposal)} />
      </details>
      </TabsContent></Tabs>
    </article>}
    {status?.jobs.length ? <details className="panel builder-inbox deck-library" open={hasActiveJobs || !proposal}><summary>Recent generations <span className="library-count">{status.jobs.length}</span></summary><p className="head-note">Results stay here until saved or deleted.</p><div className="builder-inbox-list">{status.jobs.map((job) => {
      const deck = job.result?.input.budgetSek ? job.result.budget ?? job.result.ownedOnly : job.result?.ownedOnly;
      const running = activeJob(job);
      return <article className="builder-inbox-item" key={job.id}>
        <div className="builder-inbox-top"><div><strong>{deck?.name ?? (running ? "Generating your deck" : "Generation needs review")}</strong><span>{new Date(job.createdAt).toLocaleString()} · {running ? BUILD_STEPS.find((step) => step.id === job.stage)?.title : job.status === "completed" ? "Ready to keep" : job.status === "no_deck" ? "No validated deck" : job.status === "uncertain" ? "Usage needs review" : "Stopped"}</span></div><div className="builder-inbox-actions">{deck && <button className="secondary-button" type="button" disabled={busy || saving} onClick={() => { setCurrentJobId(job.id); autoOpened.current = job.id; open(deck, job.result, undefined, job.id); }}>Review deck</button>}<button className="secondary-button" type="button" disabled={running || saving || Boolean(deleting)} onClick={() => removeGeneration(job.id)}><Trash2 aria-hidden="true" />{deleting === job.id ? "Deleting…" : "Delete"}</button></div></div>
        {job.error && <p className="head-note">{job.error.slice(0, 350)}{job.error.length > 350 ? "…" : ""}</p>}
        <details><summary>Activity log &amp; explanation</summary><p className="head-note">Generation ID: {job.id}</p>{job.result && <><p>{job.result.explanation}</p>{job.result.rejected.map((reason) => <p className="error-note" key={reason}>{reason}</p>)}<p className="head-note">{job.result.model} · estimated AI cost {money(job.result.costSek)}{job.result.costEstimated ? " (conservative reservation estimate; exact usage unavailable)" : ""}</p></>}{job.logs.length ? <ol className="builder-job-log">{job.logs.map((log, index) => <li key={index}><time>{new Date(log.createdAt).toLocaleTimeString()}</time><span>{log.message}</span></li>)}</ol> : <p className="head-note">This older request has no detailed activity log.</p>}{job.rawOutput && <details><summary>Retained AI output (unvalidated)</summary><pre className="builder-raw-output">{job.rawOutput}</pre></details>}</details>
      </article>;
    })}</div></details> : null}
    <details className="panel builder-history builder-saved deck-library" open={!proposal}><summary>Saved decks <span className="library-count">{saved.length}</span></summary>
      {saved.length ? <div className="builder-saved-list">{saved.map(({ deck, proposal }) => <button disabled={busy || saving} type="button" className="builder-saved-item" key={deck.deckId} onClick={() => open(proposal!, null, deck.deckId)}><span>{deck.name}</span><small>{new Date(deck.updatedAt).toLocaleDateString()}</small></button>)}</div> : <p className="head-note">Your decks will appear here after you save them.</p>}
      {savedError && <p className="error-note" role="alert">{savedError} <button type="button" className="secondary-button" onClick={() => { try { setSavedDecks(listDecks()); setSavedError(""); } catch (e) { setSavedError(e instanceof Error ? e.message : "Saved decks could not be loaded."); } }}>Retry</button></p>}

    </details>
  </section>;
}
