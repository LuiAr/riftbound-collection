"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import type { StrategyAnalysis, UpgradeResult } from "../lib/deck-advisor";
import type { DeckAssessment } from "../lib/deck-builder";
import type { compareRelease } from "../lib/card-releases";

type Result = { analysis: StrategyAnalysis; assessment: DeckAssessment; upgrades: UpgradeResult; unmatched: string[]; notices: string[]; warnings: string[]; references: { id: string; name: string; strategy: string; source: string }[]; collectionVersion: number; pricesAt: string | null; fxAt: string | null; rulesCheckedAt: string | null };
const money = (n: number) => new Intl.NumberFormat("en-SE", { style: "currency", currency: "SEK" }).format(n);
const percent = (n: number | null) => n === null ? "Unavailable" : `${(n * 100).toFixed(1)}%`;
export default function DeckAdviser({ deckText, name, deckId, extras, onApply }: { deckText: string; name: string; deckId?: string | null; extras?: Record<string, number>; onApply: (text: string) => void }) {
  const countKey = JSON.stringify(extras ?? {});
  const inputKey = `${deckId ?? ""}|${deckText}|${countKey}`;
  const [budget, setBudget] = useState(0);
  const [referenceSelection, setReferenceSelection] = useState<{ key: string; id: string } | null>(null);
  const referenceId = referenceSelection?.key === inputKey ? referenceSelection.id : "";
  const setReferenceId = (id: string) => setReferenceSelection({ key: inputKey, id });
  const [storedResult, setStoredResult] = useState<{ key: string; data: Result } | null>(null);
  const result = storedResult?.key === inputKey ? storedResult.data : null;
  const setResult = (value: Result | null | ((old: Result | null) => Result | null)) => setStoredResult(old => { const data = typeof value === "function" ? value(old?.key === inputKey ? old.data : null) : value; return data ? { key: inputKey, data } : null; });
  const [storedReleases, setStoredReleases] = useState<{ key: string; data: ReturnType<typeof compareRelease> } | null>(null);
  const releases = storedReleases?.key === inputKey ? storedReleases.data : null;
  const setReleases = (data: ReturnType<typeof compareRelease> | null) => setStoredReleases(data ? { key: inputKey, data } : null);
  const [busyKey, setBusyKey] = useState<string | null>(null), [storedError, setStoredError] = useState<{ key: string; message: string } | null>(null);
  const busy = busyKey === inputKey, error = storedError?.key === inputKey ? storedError.message : "";
  const setBusy = (value: boolean) => setBusyKey(value ? inputKey : null);
  const setError = (message: string) => setStoredError(message ? { key: inputKey, message } : null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { controller.current?.abort(); }, [deckText, deckId, countKey]);
  useEffect(() => () => controller.current?.abort(), []);
  async function run(action: "analyze" | "releases") {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/advisor", { method: "POST", signal: abort.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ action, name, deckText, deckId: deckId ?? undefined, budget, extras, referenceId: referenceId || undefined }) });
      const body = await response.json() as Result & { releases?: ReturnType<typeof compareRelease>; error?: string }; if (!response.ok) throw new Error(body.error || "The adviser could not complete this check.");
      if (abort.signal.aborted) return;
      if (action === "analyze") setResult(body); else setReleases(body.releases ?? null);
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Try again later."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  const corrections = result ? [...result.assessment.errors, ...result.unmatched.map(line => `Unmatched: ${line}`)] : [];
  const gaps = result?.analysis.areas.filter(area => area.referenceCopies !== null && area.copies < area.referenceCopies) ?? [];
  return <section className="panel deck-adviser" aria-label="Deck review and upgrades">
    <div className="panel-heading"><h2>Review & upgrades</h2><span className="builder-tag">Free</span></div>
    <div className="adviser-controls">
      <label><span className="field-label">Purchase budget (SEK)</span><input type="number" min="0" max="100000" value={budget} disabled={busy} onChange={e => { setBudget(Math.max(0, Math.min(100000, Number(e.target.value)))); setResult(null); }} /></label>
      <button className="primary-button" type="button" disabled={busy || !deckText.trim()} onClick={() => run("analyze")} aria-busy={busy}>{busy ? "Checking…" : "Analyze deck"}</button>
      <button className="secondary-button" type="button" disabled={busy || !deckText.trim()} onClick={() => run("releases")}>Check new cards</button>
    </div>
    <p className="head-note">0 SEK uses owned cards. Estimates exclude shipping.</p>
    {error && <p className="error-note" role="alert">{error}</p>}
    {result && <div className="adviser-results" aria-live="polite">
      <div className={`review-status ${corrections.length ? "needs-review" : ""}`}>
        {corrections.length ? <TriangleAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        <strong>{corrections.length ? "Fix these cards before upgrading" : result.rulesCheckedAt ? "Passes checked Standard rules" : "Current rules unavailable"}</strong>
        {!corrections.length && !result.rulesCheckedAt && <span>Saved rules snapshot only</span>}
      </div>
      {corrections.length > 0 && <ul className="review-corrections">{corrections.map((text, i) => <li key={i}>{text}</li>)}</ul>}
      {result.warnings.length > 0 && <p className="head-note">Some current sources are unavailable. See Sources & limitations.</p>}
      {result.notices.map((notice, i) => <p className="head-note" key={i}>{notice}</p>)}
      <div className="adviser-summary">
        <div><strong>{result.analysis.engine.length ? result.analysis.engineDeficit : "Unknown"}</strong><span>Core copies missing</span></div>
        <div><strong>{result.analysis.reference ? gaps.length : "Unknown"}</strong><span>Areas below baseline</span></div>
        <div><strong>{result.upgrades.packages.length}</strong><span>Upgrade options</span></div>
      </div>
      <p className="head-note">Counts compare with one reference plan, not a strength rating.</p>
      <details className="review-fold">
        <summary>Comparison baseline</summary>
        {result.analysis.reference ? <p><a href={result.analysis.reference.url} target="_blank" rel="noreferrer">{result.analysis.reference.name}</a> · {result.analysis.reference.strategy}</p> : <p>No recent strategy reference is available.</p>}
        {result.references.length > 1 && <label><span className="field-label">Reference deck</span><select value={referenceId} disabled={busy} onChange={e => { setReferenceId(e.target.value); setResult(current => current ? { ...current, upgrades: { before: current.analysis, packages: [], blocked: "Analyze again to use this baseline." } } : null); }}><option value="">Closest reference</option>{result.references.map(r => <option key={r.id} value={r.id}>{r.strategy} · {r.name}</option>)}</select></label>}
        {result.analysis.engine.length > 0 && <ul className="engine-quantities">{result.analysis.engine.map(card => <li key={card.cardId}><span>{card.name}</span><strong>{card.copies}/{card.target}</strong></li>)}</ul>}
      </details>
      <h3>Deck balance</h3>
      <div className="adviser-area-grid">{result.analysis.areas.map(area => {
        const difference = area.referenceCopies === null ? null : area.copies - area.referenceCopies;
        return <article className={`adviser-area ${difference !== null && difference < 0 ? "below-baseline" : ""}`} key={area.role}>
          <div><h4>{area.label}</h4><span>{difference === null ? "No baseline" : difference < 0 ? `${-difference} below` : difference > 0 ? `${difference} above` : "Matches"}</span></div>
          <p><strong>{area.copies}</strong><span>copies{area.referenceCopies !== null ? ` · reference ${area.referenceCopies}` : ""}</span></p>
          <progress aria-label={`${area.label}: ${area.copies} copies, reference ${area.referenceCopies ?? "unavailable"}`} value={area.copies} max={Math.max(area.copies, area.referenceCopies ?? 0, 1)} />
        </article>;
      })}</div>
      <details className="review-fold"><summary>Draw odds & curves</summary>
        <div className="draw-odds-list">{result.analysis.areas.map(area => <div key={area.role}><span>{area.label}</span><strong>{percent(area.access)}</strong></div>)}</div>
        <p className="head-note">Chance to see at least one in eight raw draws. Chosen champion excluded.</p>
        <p>Printed Energy: {Object.entries(result.analysis.quality.energyCurve).map(([energy, copies]) => `${energy}: ${copies}`).join(" · ")}</p>
        <p>Printed Power: {Object.entries(result.analysis.powerCurve).map(([power, copies]) => `${power}: ${copies}`).join(" · ")}</p>
        <p>Rune split: {Object.entries(result.analysis.runeSplit).map(([domain, copies]) => `${domain}: ${copies}`).join(" · ") || "No runes identified"}</p>
        {result.analysis.synergies.map(pair => <p key={`${pair.cardA}|${pair.cardB}`}>{pair.cardA} + {pair.cardB}: {percent(pair.access)} to draw both, reference {percent(pair.referenceAccess)}.</p>)}
        <p className="head-note">Draw odds do not establish playable sequences or model payment timing.</p>
      </details>
      <div className="upgrade-heading"><h3>Upgrade options</h3><span className="head-note">Whole-deck purchase cost</span></div>
      {result.upgrades.blocked && <p className="head-note">{result.upgrades.blocked}</p>}
      {!result.upgrades.packages.length && !result.upgrades.blocked && <p className="head-note">No improving swaps found within this budget. Try another baseline or a larger budget.</p>}
      <div className="adviser-package-grid">{result.upgrades.packages.map((pkg, i) => <article className="adviser-package" key={i}>
        <div className="upgrade-package-head"><h4>{pkg.name}</h4><strong>{money(pkg.assessment.totalSek)}</strong></div>
        <p>{pkg.benefit}</p>
        <div className="upgrade-swaps">{[true, false].map(add => <div key={String(add)}><h5>{add ? "Add" : "Remove"}</h5><ul>{pkg.changes.filter(change => (change.quantity > 0) === add).map(change => <li key={change.cardId}><b>{Math.abs(change.quantity)}×</b><span>{change.name}</span></li>)}</ul></div>)}</div>
        <button className="secondary-button" type="button" onClick={() => onApply(pkg.deckText)}>Apply to draft</button>
        <details className="review-fold"><summary>Tradeoffs & comparison</summary>
          <p className="head-note">{pkg.confidence} · {pkg.assessment.missingCopies} copies to buy. Save the draft to keep this version.</p>
          {pkg.tradeoffs.map(text => <p key={text}>{text}</p>)}
          <div className="upgrade-comparison">{pkg.after.areas.map(area => <div key={area.role}><span>{area.label}</span><strong>{result.analysis.areas.find(before => before.role === area.role)?.copies} → {area.copies}</strong><small>Reference {area.referenceCopies ?? "unavailable"}</small></div>)}</div>
          <textarea readOnly aria-label="Proposed deck list" value={pkg.deckText} />
        </details>
      </article>)}</div>
      <details className="review-fold"><summary>Sources & limitations</summary>
        <p>{result.analysis.method}</p><p>{result.analysis.quality.assumptions}</p>
        {[...result.warnings, ...result.analysis.warnings].map((text, i) => <p key={i}>{text}</p>)}
        {extras && Object.keys(extras).length > 0 && <p>Temporary counts from this build are included.</p>}
        <p>Estimates cover missing copies for the entire resulting deck and require current prices. They exclude shipping and do not represent seller offers.</p>
        {result.analysis.reference && <p>{result.analysis.reference.evidenceKind} source · {result.analysis.reference.date}</p>}
        <p>Collection version {result.collectionVersion} · prices {result.pricesAt ?? "unavailable"} · FX {result.fxAt ?? "unavailable"} · rules {result.rulesCheckedAt ?? "unavailable"} · analyzer {result.analysis.version}</p>
      </details>
    </div>}
    {releases && <div className="release-results" aria-live="polite">
      <h3>New cards</h3><p>{releases.totalCandidates} compatible cards · {releases.previewCount} previews</p>
      <p className="head-note">{releases.note}</p>
      <div className="release-card-list">{releases.candidates.map(card => <details className="review-fold" key={card.cardId}>
        <summary><span>{card.name}</span><span className="builder-tag">{card.status}</span></summary>
        <p>{card.kind} · {card.set} · Energy {card.energy ?? "unknown"}</p><p>{card.reason}</p><p className="release-card-text">{card.text}</p>
        {card.dataGaps.map(gap => <p className="head-note" key={gap}>{gap}</p>)}<a href={card.source} target="_blank" rel="noreferrer">Official card source</a>
      </details>)}</div>
      {!releases.candidates.length && <p className="head-note">No compatible additions since the recorded snapshot.</p>}
      <p className="head-note">Feed snapshot: {releases.snapshotAt.slice(0, 10)}</p>
    </div>}
  </section>;
}
