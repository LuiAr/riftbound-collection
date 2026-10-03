import { cardsById, eligibleReferences, RULES, strategyProfile, type DeckEntry, type DeckProposal, type ReferenceDeck } from "./deck-builder";

function counts(entries: DeckEntry[], sections: string[]) {
  const result = new Map<string, number>();
  for (const entry of entries) if (sections.includes(entry.section)) result.set(entry.cardId, (result.get(entry.cardId) ?? 0) + entry.quantity);
  return result;
}
export function referenceFingerprint(ref: ReferenceDeck, mainOnly = false): string {
  const sections = mainOnly ? ["legend", "chosen", "main"] : ["legend", "chosen", "main", "runes", "battlefields", "sideboard"];
  const totals = new Map<string, number>();
  for (const entry of ref.entries) if (sections.includes(entry.section)) {
    const key = `${entry.section}|${entry.cardId}`;
    totals.set(key, (totals.get(key) ?? 0) + entry.quantity);
  }
  return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
}
export function referencePriority(ref: ReferenceDeck): number {
  const kind = ref.evidenceKind ?? "community";
  return (kind === "official" ? 0 : kind === "reported" ? 1000 : 2000) + (ref.placement ?? 999);
}
export function selectReferences(legendId: string, now = Date.now()): ReferenceDeck[] {
  const unique = new Map<string, ReferenceDeck>();
  for (const ref of eligibleReferences(legendId)) {
    const date = Date.parse(ref.date);
    if (!Number.isFinite(date) || date < Date.parse(RULES.effectiveAt) || date > now || now - date > 90 * 86400000) continue;
    const key = referenceFingerprint(ref);
    const previous = unique.get(key);
    if (!previous || referencePriority(ref) < referencePriority(previous)) unique.set(key, ref);
  }
  const groups = new Map<string, ReferenceDeck[]>();
  for (const ref of [...unique.values()].sort((a, b) => referencePriority(a) - referencePriority(b) || b.date.localeCompare(a.date))) {
    groups.set(ref.strategy, [...(groups.get(ref.strategy) ?? []), ref]);
  }
  const selected: ReferenceDeck[] = [];
  for (let round = 0; selected.length < 20; round += 1) {
    let added = false;
    for (const group of groups.values()) if (group[round] && selected.length < 20) { selected.push(group[round]); added = true; }
    if (!added) break;
  }
  return selected;
}
export function referenceEvidence(refs: ReferenceDeck[]) {
  const independentMainLists = new Set(refs.map((ref) => referenceFingerprint(ref, true))).size;
  const official = refs.filter((ref) => ref.evidenceKind === "official");
  const resultEvents = new Set(refs.filter((ref) => ref.event).map((ref) => `${ref.event}|${ref.date}`)).size;
  const topEight = official.filter((ref) => ref.placement !== null && ref.placement <= 8).length;
  const unknownDates = refs.filter((ref) => ref.dateKind.startsWith("Collection date")).length;
  return { references: refs.length, independentMainLists, resultEvents, official: official.length, topEight, reported: refs.filter((ref) => ref.evidenceKind === "reported").length, community: refs.filter((ref) => !ref.evidenceKind || ref.evidenceKind === "community").length, unknownDates,
    label: topEight ? "Recent official finalist reference" : official.length ? "Official event reference; adapted deck untested" : "Limited competitive evidence",
    warnings: [
      ...(independentMainLists < 10 ? [`Only ${independentMainLists} distinct main list${independentMainLists === 1 ? "" : "s"}; fewer than the target of 10–20.`] : []),
      ...(resultEvents < 2 ? ["Result evidence does not cover multiple confirmed events."] : []),
      ...(unknownDates ? ["Some exact update and event dates are unavailable."] : []),
      ...(!refs.every((ref) => ref.strategyReviewed) ? ["This strategy has not received a full card-role review."] : []),
      "Reference results do not establish this adapted deck's competitive strength.",
    ],
  };
}
export function strategyGroups(refs: ReferenceDeck[]) {
  const names = [...new Set(refs.map((ref) => ref.strategy))];
  return names.map((strategy) => {
    const group = refs.filter((ref) => ref.strategy === strategy);
    return { strategy, referenceIds: group.map((ref) => ref.id), evidence: referenceEvidence(group), cards: strategyProfile(group),
      annotationNotice: "Engine annotations are reviewed judgments scoped to this strategy, not proofs of optimality. Frequency and median copies describe references, not essentiality. Review card roles and sequencing from the supplied text." };
  });
}
function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i += 1) result = result * (n - i + 1) / i;
  return result;
}
export function accessProbability(pool: number, copies: number, seen: number): number | null {
  if (![pool, copies, seen].every(Number.isSafeInteger) || pool < 1 || copies < 0 || copies > pool || seen < 0 || seen > pool) return null;
  return 1 - combination(pool - copies, seen) / combination(pool, seen);
}
export function jointAccessProbability(pool: number, copiesA: number, copiesB: number, seen: number): number | null {
  const a = accessProbability(pool, copiesA, seen), b = accessProbability(pool, copiesB, seen), union = accessProbability(pool, copiesA + copiesB, seen);
  return a === null || b === null || union === null ? null : a + b - union;
}
export function qualityChecks(deck: DeckProposal, refs: ReferenceDeck[], seen = 8) {
  const inspiration = refs.filter((ref) => deck.referenceIds.includes(ref.id));
  const evidence = referenceEvidence(inspiration);
  const main = counts(deck.entries, ["main"]);
  const pool = [...main.values()].reduce((sum, q) => sum + q, 0);
  const benchmark = [...inspiration].sort((a, b) => referencePriority(a) - referencePriority(b))[0];
  const baseline = benchmark ? counts(benchmark.entries, ["main"]) : new Map<string, number>();
  const baselinePool = [...baseline.values()].reduce((sum, q) => sum + q, 0);
  const chosen = new Set(deck.entries.filter((entry) => entry.section === "chosen").map((entry) => entry.cardId));
  const engine = strategyProfile(inspiration).filter((card) => card.essential || cardsById.get(card.cardId)?.super === "Signature").map((card) => ({
    cardId: card.cardId, role: card.essential ? "Reviewed engine card" : "Signature; importance needs review", copies: main.get(card.cardId) ?? 0,
    chosen: chosen.has(card.cardId), referenceCopies: baseline.get(card.cardId) ?? 0,
    access: chosen.has(card.cardId) ? null : accessProbability(pool, main.get(card.cardId) ?? 0, seen),
    referenceAccess: accessProbability(baselinePool, baseline.get(card.cardId) ?? 0, seen),
  }));
  const earlyUnits = [...main].reduce((sum, [id, q]) => { const c = cardsById.get(id); return sum + (c?.type === "Unit" && c.energy !== null && c.energy <= 2 ? q : 0); }, 0);
  const highCost = [...main].reduce((sum, [id, q]) => sum + ((cardsById.get(id)?.energy ?? 0) >= 6 ? q : 0), 0);
  const energyCurve: Record<string, number> = {};
  for (const [id, q] of main) { const energy = cardsById.get(id)?.energy; const key = energy === null || energy === undefined ? "Unknown" : String(energy); energyCurve[key] = (energyCurve[key] ?? 0) + q; }
  const reductions = engine.filter((card) => !card.chosen && card.copies < card.referenceCopies).map((card) => `${cardsById.get(card.cardId)?.name}: ${card.copies} drawn copies versus ${card.referenceCopies} in the selected reference.`);
  return { evidence, benchmarkId: benchmark?.id ?? null, pool, seen, engine, earlyUnits, earlyUnitAccess: accessProbability(pool, earlyUnits, seen), highCost, energyCurve,
    warnings: [...reductions, ...(!inspiration.length ? ["No preserved reference metadata is available for this saved deck."] : []), ...(!engine.length ? ["No reviewed engine access test is available for this strategy."] : [])],
    assumptions: "Exact raw-draw access, excluding the chosen champion. No mulligans, extra draws, tutors, resource availability, timing or opponent. Early unit means printed Energy at most 2; it is not a guaranteed playable unit. This is not a full-game simulation or a win-rate estimate.",
  };
}
