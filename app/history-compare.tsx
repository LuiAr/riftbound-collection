"use client";

import { useState } from "react";
import SingleFilter from "../components/single-filter";
import { compareVersions, type PrintingChange, type VersionComparison } from "../lib/history-diff";
import type { CollectionSnapshot, CollectionVersion } from "../lib/server-collection";

type Result = { earlier: CollectionVersion; later: CollectionVersion; comparison: VersionComparison };

function quantityLabel(standard: number, foil: number): string {
  return `${standard} standard · ${foil} foil`;
}

function ChangeGroup({ title, items }: { title: string; items: PrintingChange[] }) {
  if (!items.length) return null;
  return <section className="comparison-group"><h3>{title} <span>{items.length}</span></h3><div className="comparison-rows">{items.map((item) => <div className="comparison-row" key={item.key}><div><strong>{item.name}</strong><small>{item.expansion} · {item.printNumber}</small></div><p><span>{quantityLabel(item.before.standard, item.before.foil)}</span><span aria-hidden="true">→</span><strong>{quantityLabel(item.after.standard, item.after.foil)}</strong></p></div>)}</div></section>;
}

export default function HistoryCompare({ history, latest }: { history: CollectionVersion[]; latest: CollectionSnapshot }) {
  const [firstId, setFirstId] = useState(history[1]?.importId ?? history[0]?.importId ?? "");
  const [secondId, setSecondId] = useState(history[0]?.importId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function loadSnapshot(importId: string): Promise<CollectionSnapshot> {
    if (importId === latest.importId) return latest;
    const response = await fetch(`/api/history?importId=${encodeURIComponent(importId)}`, { cache: "no-store" });
    const data = await response.json() as { snapshot?: CollectionSnapshot; error?: string };
    if (!response.ok || !data.snapshot) throw new Error(data.error || "A collection version could not be loaded.");
    return data.snapshot;
  }

  async function compare() {
    setError(""); setResult(null);
    if (!firstId || !secondId || firstId === secondId) { setError("Choose two different versions to compare."); return; }
    const first = history.find((item) => item.importId === firstId);
    const second = history.find((item) => item.importId === secondId);
    if (!first || !second) { setError("Choose two saved versions."); return; }
    const [earlier, later] = first.version < second.version ? [first, second] : [second, first];
    setBusy(true);
    try {
      const [before, after] = await Promise.all([loadSnapshot(earlier.importId), loadSnapshot(later.importId)]);
      setResult({ earlier, later, comparison: compareVersions(before.rows, after.rows) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The comparison could not be loaded."); }
    finally { setBusy(false); }
  }

  const options = history.map((item) => ({ value: item.importId, label: `Version ${item.version} · ${item.sourceName}` }));
  return <section className="history-compare" aria-labelledby="compare-title">
    <div className="history-compare-heading"><div><h2 id="compare-title">Compare imports</h2><p>See changes to exact card printings and foil counts.</p></div></div>
    {history.length >= 2 ? <>
      <div className="comparison-controls"><SingleFilter label="First version" value={firstId} options={options} onChange={(value) => { setFirstId(value); setResult(null); }} /><SingleFilter label="Second version" value={secondId} options={options} onChange={(value) => { setSecondId(value); setResult(null); }} /><button type="button" className="primary-button" onClick={compare} disabled={busy}>{busy ? "Comparing…" : "Compare"}</button></div>
      {error && <p className="error-note" role="alert">{error}</p>}
      {result && <div className="comparison-result" aria-live="polite"><p className="comparison-caption">Version {result.earlier.version} → Version {result.later.version}</p><div className="comparison-totals"><span><strong>{result.comparison.added}</strong> added</span><span><strong>{result.comparison.removed}</strong> removed</span><span><strong>{result.comparison.changed}</strong> changed</span></div>{result.comparison.changes.length ? <><ChangeGroup title="Added printings" items={result.comparison.changes.filter((item) => item.kind === "added")} /><ChangeGroup title="Removed printings" items={result.comparison.changes.filter((item) => item.kind === "removed")} /><ChangeGroup title="Changed quantities" items={result.comparison.changes.filter((item) => item.kind === "changed")} /></> : <p className="comparison-empty">These versions have the same card and foil quantities.</p>}</div>}
    </> : <p className="comparison-empty">Import another Card Nexus export to compare versions.</p>}
  </section>;
}
