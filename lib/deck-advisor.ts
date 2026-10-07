import { assessDeck, builderCards, cardsById, cheapestPrice, compatible, exportDeck, isBannedCard, normalizeCard, strategyProfile, type BuilderCard, type DeckEntry, type DeckProposal, type DeckSection, type FxSnapshot, type ReferenceDeck } from "./deck-builder";
import { accessProbability, jointAccessProbability, qualityChecks, referencePriority, selectReferences } from "./deck-quality";
import type { PriceSnapshot } from "./prices";

export const ADVISOR_VERSION = "2026-10-07.1";
export const ROLE_LABELS = { interaction: "Interaction", movement: "Movement", draw: "Card access", protection: "Protection", recovery: "Recovery", resources: "Resource support", early: "Early units", threats: "Units" };
export type CardRole = keyof typeof ROLE_LABELS;
// Conservative text signals, not a rules interpreter. Never infer effects from names.
export function cardRoles(card: BuilderCard): CardRole[] {
  const text = card.text.toLowerCase();
  const roles: CardRole[] = [];
  if (/deal \d+|kill (?:an? |the |all )?(?:enemy|opposing)|kill a unit|stun|counter (?:a |an |the )?(?:spell|ability)|return (?:an? |the )?enemy|give (?:an? |the )?(?:enemy )?unit -/.test(text)) roles.push("interaction");
  if (/\[mobile\]|move (?:a |another |any )?(?:friendly |different )?unit|move me|move this/.test(text)) roles.push("movement");
  if (/draw \d+|predict|look at the top|search your/.test(text)) roles.push("draw");
  if (/deflect|if .{0,45}would die|heal (?:a |that |the )?(?:friendly )?unit|prevent/.test(text)) roles.push("protection");
  if (/(?:play|return|put|banish).{0,100}(?:from|in) (?:your|a) trash/.test(text)) roles.push("recovery");
  if (/\[add\]|channel \d+|ready.{0,30}runes|costs? .{0,25}(?:less|reduced)/.test(text)) roles.push("resources");
  if (card.type === "Unit") { roles.push("threats"); if (card.energy !== null && card.energy <= 2) roles.push("early"); }
  return roles;
}
export function cardDataGaps(card: BuilderCard): string[] {
  return [
    ...(["Unit", "Spell", "Gear"].includes(card.type) && card.energy === null ? ["Printed Energy unavailable"] : []),
    ...(card.type === "Gear" && /\[?Equip\]?/i.test(card.text) && !/equipped unit|attached unit/i.test(card.text) ? ["Attachment stat panel unavailable; equipment effects need image review"] : []),
  ];
}
const headings: Record<string, DeckSection> = { legend: "legend", legends: "legend", champion: "chosen", "chosen champion": "chosen", chosen: "chosen", "champion legend": "legend", main: "main", "main deck": "main", runes: "runes", "rune deck": "runes", "rune pool": "runes", battlefield: "battlefields", battlefields: "battlefields", sideboard: "sideboard" };
export function parseAdvisorDeck(name: string, text: string) {
  let section: DeckSection | null = null;
  const entries: DeckEntry[] = [], unmatched: string[] = [], notices: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const heading = normalizeCard(line.replace(/:\s*$/, ""));
    if (headings[heading]) { section = headings[heading]; continue; }
    const match = line.match(/^(\d+)\s*x?\s+(.+?)\s*$/i) ?? line.match(/^(\d+)x\s*(.+)$/i);
    const trailing = !match ? line.match(/^(.+?)\s+x(\d+)$/i) : null;
    const quantity = Number(match?.[1] ?? trailing?.[2]);
    const id = normalizeCard(match?.[2] ?? trailing?.[1] ?? "");
    const card = cardsById.get(id);
    if (!card || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 12) { unmatched.push(line); continue; }
    const inferred: DeckSection = card.type === "Legend" ? "legend" : card.type === "Rune" ? "runes" : card.type === "Battlefield" ? "battlefields" : "main";
    const target = section ?? inferred;
    const existing = entries.find(e => e.cardId === id && e.section === target);
    if (existing) existing.quantity += quantity; else entries.push({ cardId: id, quantity, section: target });
  }
  const legend = cardsById.get(entries.find(e => e.section === "legend")?.cardId ?? "");
  if (!entries.some(e => e.section === "chosen") && legend) {
    const candidates = entries.filter(e => e.section === "main" && cardsById.get(e.cardId)?.super === "Champion" && cardsById.get(e.cardId)!.tags.some(t => legend.tags.includes(t)));
    if (candidates.length === 1) {
      candidates[0].quantity -= 1; entries.push({ cardId: candidates[0].cardId, quantity: 1, section: "chosen" });
      notices.push(`Inferred chosen champion: ${cardsById.get(candidates[0].cardId)!.name}. Check this before applying changes.`);
    } else notices.push("Add a Chosen champion section to identify the chosen unit.");
  }
  const deck: DeckProposal = { name: name || "Deck", entries: entries.filter(e => e.quantity > 0), strategy: "", summary: "", referenceIds: [], replacements: [], limitations: notices };
  return { deck, unmatched, notices };
}
function counts(entries: DeckEntry[], sections = ["main", "chosen"]) {
  const result: Record<string, number> = {};
  for (const entry of entries) if (sections.includes(entry.section)) result[entry.cardId] = (result[entry.cardId] ?? 0) + entry.quantity;
  return result;
}
function roleCounts(entries: DeckEntry[]) {
  const result = Object.fromEntries(Object.keys(ROLE_LABELS).map(k => [k, 0])) as Record<CardRole, number>;
  for (const e of entries.filter(e => e.section === "main")) for (const role of cardRoles(cardsById.get(e.cardId)!)) result[role] += e.quantity;
  return result;
}
export function nearestReference(deck: DeckProposal, refs?: ReferenceDeck[]): ReferenceDeck | null {
  const legend = deck.entries.find(e => e.section === "legend")?.cardId;
  const pool = refs ?? (legend ? selectReferences(legend) : []);
  const current = counts(deck.entries);
  return [...pool].filter(r => r.legendId === legend).sort((a, b) => {
    const overlap = (r: ReferenceDeck) => Object.entries(counts(r.entries)).reduce((s, [id, q]) => s + Math.min(q, current[id] ?? 0), 0);
    return overlap(b) - overlap(a) || referencePriority(a) - referencePriority(b) || a.id.localeCompare(b.id);
  })[0] ?? null;
}
export function analyzeStrategy(deck: DeckProposal, reference?: ReferenceDeck | null) {
  const ref = reference === undefined ? nearestReference(deck) : reference;
  const current = roleCounts(deck.entries), target = ref ? roleCounts(ref.entries) : null;
  const entries = counts(deck.entries);
  const quality = qualityChecks({ ...deck, referenceIds: ref ? [ref.id] : [] }, ref ? [ref] : []);
  const powerCurve: Record<string, number> = {}, runeSplit: Record<string, number> = {};
  for (const e of deck.entries) {
    const c = cardsById.get(e.cardId); if (!c) continue;
    if (e.section === "main") { const key = c.power === null ? "Unspecified" : c.power; powerCurve[key] = (powerCurve[key] ?? 0) + e.quantity; }
    if (e.section === "runes") for (const domain of c.domains) runeSplit[domain] = (runeSplit[domain] ?? 0) + e.quantity;
  }
  const drawnEngine = quality.engine.filter(c => !c.chosen);
  const synergies = drawnEngine.flatMap((a, i) => drawnEngine.slice(i + 1).map(b => ({ cardA: cardsById.get(a.cardId)!.name, cardB: cardsById.get(b.cardId)!.name, access: jointAccessProbability(quality.pool, a.copies, b.copies, 8), referenceAccess: jointAccessProbability(quality.pool, a.referenceCopies, b.referenceCopies, 8) })));
  const profile = ref ? strategyProfile([ref]) : [];
  const engine = profile.filter(p => p.essential).map(p => ({ cardId: p.cardId, name: cardsById.get(p.cardId)!.name, copies: entries[p.cardId] ?? 0, target: p.medianCopies }));
  const deficits = engine.reduce((s, c) => s + Math.max(0, c.target - c.copies), 0);
  const areas = (Object.keys(ROLE_LABELS) as CardRole[]).map(role => ({ role, label: ROLE_LABELS[role], copies: current[role], referenceCopies: target?.[role] ?? null,
    access: accessProbability(quality.pool, current[role], 8),
    observation: target ? current[role] < target[role] ? `Fewer copies than reference (${current[role]} vs ${target[role]}).` : current[role] > target[role] ? `More copies than reference (${current[role]} vs ${target[role]}). Check the slots this uses.` : "Same count as reference." : "No strategy baseline available." }));
  const referenceCurve = ref ? qualityChecks({ ...deck, entries: ref.entries, referenceIds: [ref.id] }, [ref]).energyCurve : {};
  const energyDifference = ref ? Object.keys({ ...quality.energyCurve, ...referenceCurve }).reduce((s, k) => s + Math.abs((quality.energyCurve[k] ?? 0) - (referenceCurve[k] ?? 0)), 0) / 2 : 0;
  // This loss measures deviation from a selected plan, not competitive power.
  const roleDifference = target ? (Object.keys(ROLE_LABELS) as CardRole[]).reduce((s, r) => s + Math.abs(current[r] - target[r]), 0) : 0;
  const loss = deficits * 12 + roleDifference * 2 + energyDifference;
  const gaps = [...new Set(deck.entries.flatMap(e => { const c = cardsById.get(e.cardId); return c ? cardDataGaps(c).map(g => `${c.name}: ${g}`) : []; }))];
  return { version: ADVISOR_VERSION, reference: ref ? { id: ref.id, name: ref.name, url: ref.url, strategy: ref.strategy, date: ref.date, source: ref.source, evidenceKind: ref.evidenceKind ?? "community", reviewed: Boolean(ref.strategyReviewed) } : null,
    areas, engine, engineDeficit: deficits, energyDifference, roleDifference, loss, quality, powerCurve, runeSplit, synergies, dataGaps: gaps,
    warnings: [...(!ref ? ["No recent legal strategy reference is available. Recommendations require review."] : ["Closest list is a comparison baseline, not confirmation of your intended strategy."]), ...(!engine.length ? ["No reviewed engine package is available for this strategy."] : []), ...gaps],
    method: "Text signals can miss conditional effects and do not measure effect strength. Counts exclude the chosen champion from raw draws. Deviations show trade-offs against one strategy; lower deviation is not a win-rate prediction. Upgrade search is bounded to six copy swaps and is not exhaustive." };
}
export type StrategyAnalysis = ReturnType<typeof analyzeStrategy>;
export function deckChanges(before: DeckEntry[], after: DeckEntry[]) {
  const a = counts(before, ["legend", "chosen", "main", "runes", "battlefields", "sideboard"]), b = counts(after, ["legend", "chosen", "main", "runes", "battlefields", "sideboard"]);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].map(cardId => ({ cardId, name: cardsById.get(cardId)?.name ?? cardId, quantity: (b[cardId] ?? 0) - (a[cardId] ?? 0) })).filter(e => e.quantity !== 0);
}
function replaceCopy(entries: DeckEntry[], from: string, to: string): DeckEntry[] {
  const next = entries.map(e => ({ ...e })); const removed = next.find(e => e.section === "main" && e.cardId === from)!;
  removed.quantity--; const added = next.find(e => e.section === "main" && e.cardId === to);
  if (added) added.quantity++; else next.push({ cardId: to, quantity: 1, section: "main" });
  return next.filter(e => e.quantity > 0);
}
export function upgradeDeck(deck: DeckProposal, owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null, budget: number, reference?: ReferenceDeck | null) {
  const ref = reference === undefined ? nearestReference(deck) : reference;
  const priceLookup = new Map([...new Set([...deck.entries, ...(ref?.entries ?? [])].map(e => e.cardId))].map(id => [id, cheapestPrice(id, prices, fx)]));
  const before = analyzeStrategy(deck, ref), base = assessDeck(deck.entries, owned, prices, fx, budget, priceLookup);
  if (base.errors.length || !ref) return { before, packages: [], blocked: base.errors.length ? "Resolve legality errors before applying upgrades." : "No strategy reference available." };
  const target = counts(ref.entries), profile = strategyProfile([ref]);
  const essential = new Set(profile.filter(p => p.essential).map(p => p.cardId));
  const targetRoles = roleCounts(ref.entries), targetEnergy: Record<string, number> = {};
  const roles = new Map([...priceLookup.keys()].map(id => [id, cardRoles(cardsById.get(id)!)]));
  for (const e of ref.entries.filter(e => e.section === "main")) { const key = String(cardsById.get(e.cardId)?.energy ?? "Unknown"); targetEnergy[key] = (targetEnergy[key] ?? 0) + e.quantity; }
  function score(entries: DeckEntry[]) {
    const have = counts(entries), roleTotals = Object.fromEntries(Object.keys(ROLE_LABELS).map(k => [k, 0])) as Record<CardRole, number>, energy: Record<string, number> = {};
    for (const e of entries.filter(e => e.section === "main")) {
      for (const r of roles.get(e.cardId) ?? []) roleTotals[r] += e.quantity;
      const key = String(cardsById.get(e.cardId)?.energy ?? "Unknown"); energy[key] = (energy[key] ?? 0) + e.quantity;
    }
    const deficit = profile.filter(p => p.essential).reduce((sum, p) => sum + Math.max(0, p.medianCopies - (have[p.cardId] ?? 0)), 0);
    return deficit * 12 + (Object.keys(ROLE_LABELS) as CardRole[]).reduce((sum, r) => sum + Math.abs(roleTotals[r] - targetRoles[r]), 0) * 2 + Object.keys({ ...targetEnergy, ...energy }).reduce((sum, k) => sum + Math.abs((energy[k] ?? 0) - (targetEnergy[k] ?? 0)), 0) / 2;
  }
  type State = { deck: DeckProposal; loss: number; assessment: ReturnType<typeof assessDeck> };
  let beam: State[] = [{ deck, loss: before.loss, assessment: base }];
  const candidates = new Map<string, State>(), seen = new Set<string>();
  for (let depth = 0; depth < 6; depth++) {
    const expanded: State[] = [];
    for (const state of beam) {
      const have = counts(state.deck.entries);
      const additions = ref.entries.filter(e => e.section === "main" && (have[e.cardId] ?? 0) < (target[e.cardId] ?? 0));
      const removals = state.deck.entries.filter(e => e.section === "main" && (!essential.has(e.cardId) || (have[e.cardId] ?? 0) > (target[e.cardId] ?? 0))).sort((a, b) => ((have[b.cardId] ?? 0) - (target[b.cardId] ?? 0)) - ((have[a.cardId] ?? 0) - (target[a.cardId] ?? 0))).slice(0, 8);
      for (const add of additions) for (const remove of removals) {
        if (add.cardId === remove.cardId) continue;
        const entries = replaceCopy(state.deck.entries, remove.cardId, add.cardId);
        const key = JSON.stringify(entries.map(e => `${e.section}|${e.cardId}|${e.quantity}`).sort());
        if (seen.has(key)) continue; seen.add(key);
        const loss = score(entries); if (loss >= state.loss) continue;
        const assessment = assessDeck(entries, owned, prices, fx, budget, priceLookup); if (!assessment.budgetValid) continue;
        const candidate = { deck: { ...deck, entries, referenceIds: [ref.id], strategy: ref.strategy }, loss, assessment };
        candidates.set(key, candidate); expanded.push(candidate);
      }
    }
    beam = expanded.sort((a, b) => a.loss - b.loss || a.assessment.totalSek - b.assessment.totalSek).slice(0, 4);
    if (!beam.length) break;
  }
  const ranked = [...candidates.values()].sort((a, b) => a.loss - b.loss || a.assessment.totalSek - b.assessment.totalSek);
  const cheapest = [...ranked].sort((a, b) => a.assessment.totalSek - b.assessment.totalSek || a.loss - b.loss)[0];
  const ownedBest = ranked.find(s => s.assessment.ownedOnlyValid);
  const selected = [ownedBest, cheapest, ranked[0]].filter((s): s is State => Boolean(s));
  const unique = [...new Map(selected.map(s => [exportDeck(s.deck), s])).values()];
  return { before, blocked: null, packages: unique.map(s => { const analysis = analyzeStrategy(s.deck, ref); return ({ name: s.assessment.ownedOnlyValid ? "Use owned cards" : "Budget package", deck: s.deck, deckText: exportDeck(s.deck), assessment: s.assessment, after: analysis, changes: deckChanges(deck.entries, s.deck.entries),
    benefit: `Reviewed engine deficit ${before.engineDeficit} → ${analysis.engineDeficit}; role deviation ${before.roleDifference} → ${analysis.roleDifference}; Energy deviation ${before.energyDifference} → ${analysis.energyDifference}.`,
    tradeoffs: analysis.areas.filter(a => a.copies < (before.areas.find(b => b.role === a.role)?.copies ?? 0)).map(a => `${a.label}: fewer copies (${before.areas.find(b => b.role === a.role)!.copies} → ${a.copies}).`),
    confidence: ref.strategyReviewed ? "Reviewed engine; adapted list untested" : "Reference-guided experiment; engine unreviewed" }); }) };
}
export type UpgradeResult = ReturnType<typeof upgradeDeck>;

export function rankDeckCandidates(decks: DeckProposal[], owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null, budget: number, refs?: ReferenceDeck[]) {
  const ranked = decks.flatMap(deck => {
    const assessment = assessDeck(deck.entries, owned, prices, fx, budget);
    if (!assessment.budgetValid) return [];
    const supplied = refs?.filter(r => deck.referenceIds.includes(r.id));
    const ref = nearestReference(deck, supplied?.length ? supplied : undefined);
    const analysis = analyzeStrategy(deck, ref);
    return [{ deck, assessment, analysis, engineRisk: analysis.engine.length ? analysis.engineDeficit ? 2 : 0 : 1, evidencePriority: ref ? referencePriority(ref) : 3000 }];
  });
  const seen = new Set<string>();
  return ranked.sort((a, b) => a.engineRisk - b.engineRisk || a.analysis.loss - b.analysis.loss || a.evidencePriority - b.evidencePriority || a.assessment.totalSek - b.assessment.totalSek).filter(s => { const key = exportDeck(s.deck); if (seen.has(key)) return false; seen.add(key); return true; });
}

function similarity(a: BuilderCard, b: BuilderCard) {
  const ar = cardRoles(a), br = cardRoles(b);
  return ar.filter(r => br.includes(r)).length * 4 - ar.filter(r => !br.includes(r)).length * 6 - Math.abs((a.energy ?? 4) - (b.energy ?? 4)) * 2 + (a.type === b.type ? 8 : -30);
}
// Search actual packages, with strict final validation and no invented card effects.
export function collectionCandidates(legendId: string, owned: Record<string, number>, prices: PriceSnapshot | null, fx: FxSnapshot | null, budget: number, refs = selectReferences(legendId)) {
  const legend = cardsById.get(legendId); if (!legend) return [];
  const pool = builderCards.filter(c => compatible(c, legend) && !isBannedCard(c.name));
  const quotes = new Map(pool.map(c => [c.id, budget > 0 ? cheapestPrice(c.id, prices, fx) : null]));
  const results: { deck: DeckProposal; assessment: ReturnType<typeof assessDeck>; analysis: StrategyAnalysis }[] = [];
  for (const ref of refs) {
    const original: DeckProposal = { name: `${cardsById.get(legendId)!.name} from your collection`, strategy: ref.strategy, summary: "Reference-guided candidate. Review substitutions and test the plan before competitive play.", referenceIds: [ref.id], entries: ref.entries.map(e => ({ ...e })), replacements: [], limitations: [] };
    // Optional sideboard cannot consume budget or copies needed by the main deck.
    original.entries = original.entries.filter(e => e.section !== "sideboard");
    const exact = assessDeck(original.entries, owned, prices, fx, budget);
    if (exact.budgetValid) { results.push({ deck: original, assessment: exact, analysis: analyzeStrategy(original, ref) }); continue; }
    const next: DeckEntry[] = [];
    const used: Record<string, number> = {};
    let failed = false;
    const essential = new Set(strategyProfile([ref]).filter(p => p.essential).map(p => p.cardId));
    const slots = [...original.entries].sort((a, b) => (a.section === "legend" ? -3 : a.section === "chosen" ? -2 : essential.has(a.cardId) ? -1 : 0) - (b.section === "legend" ? -3 : b.section === "chosen" ? -2 : essential.has(b.cardId) ? -1 : 0));
    for (const e of slots) for (let i = 0; i < e.quantity; i++) {
      const source = cardsById.get(e.cardId)!;
      const requiredCost = Object.entries(used).reduce((sum, [id, q]) => sum + Math.max(0, q - (owned[id] ?? 0)) * (quotes.get(id)?.unitSek ?? 0), 0);
      const signatures = Object.entries(used).reduce((sum, [id, q]) => sum + (cardsById.get(id)?.super === "Signature" ? q : 0), 0);
      const choices = pool.filter(c => c.type === source.type &&
        ((owned[c.id] ?? 0) > (used[c.id] ?? 0) || quotes.get(c.id) && requiredCost + quotes.get(c.id)!.unitSek <= budget) &&
        (e.section === "chosen" ? c.super === "Champion" && c.tags.some(t => legend.tags.includes(t)) : e.section === "legend" ? c.id === legendId : true) &&
        (c.super !== "Signature" || signatures < 3) &&
        (["main", "chosen"].includes(e.section) ? (used[c.id] ?? 0) < (/\[Unique\]/i.test(c.text) ? 1 : 3) : e.section === "battlefields" ? !(used[c.id] ?? 0) : true) &&
        (e.section !== "main" || similarity(source, c) >= 4) && (c.id === source.id || !cardDataGaps(c).length)).sort((a, b) => {
          const priority = (c: BuilderCard) => ((owned[c.id] ?? 0) > (used[c.id] ?? 0) ? 100 : -Math.min(100, quotes.get(c.id)?.unitSek ?? 100)) + (c.id === source.id ? essential.has(c.id) ? 300 : 80 : similarity(source, c));
          return priority(b) - priority(a) || a.id.localeCompare(b.id);
        });
      const replacement = choices[0];
      if (!replacement) { failed = true; break; }
      const line = next.find(n => n.section === e.section && n.cardId === replacement.id);
      if (line) line.quantity++; else next.push({ cardId: replacement.id, quantity: 1, section: e.section });
      used[replacement.id] = (used[replacement.id] ?? 0) + 1;
      if (replacement.id !== source.id) original.replacements.push({ fromCardId: source.id, toCardId: replacement.id, reason: "Card with matching type and conservative text-role signals, fitted to ownership and budget.", compromise: "Conditional effects, targeting and sequencing require player review." });
    }
    if (failed) continue;
    const candidate = { ...original, entries: next.filter(e => e.quantity > 0) };
    const assessment = assessDeck(candidate.entries, owned, prices, fx, budget);
    if (!assessment.budgetValid) continue;
    const analysis = analyzeStrategy(candidate, ref);
    candidate.limitations = [...analysis.warnings, ...(analysis.engineDeficit ? ["Owned substitutions reduce a reviewed engine package. Treat this as an experimental plan."] : [])];
    results.push({ deck: candidate, assessment, analysis });
    if (budget > 0) for (const upgrade of upgradeDeck(candidate, owned, prices, fx, budget, ref).packages) results.push({ deck: upgrade.deck, assessment: upgrade.assessment, analysis: upgrade.after });
  }
  return [...new Map(results.map(s => [exportDeck(s.deck), s])).values()].sort((a, b) => a.analysis.engineDeficit - b.analysis.engineDeficit || a.analysis.loss - b.analysis.loss || referencePriority(refs.find(r => r.id === a.deck.referenceIds[0])!) - referencePriority(refs.find(r => r.id === b.deck.referenceIds[0])!) || a.assessment.totalSek - b.assessment.totalSek).slice(0, 5);
}
