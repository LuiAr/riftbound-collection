import { compareRelease, loadReleaseCards, previewSnapshot } from "./card-releases";
import { displayCards, type InventoryRow } from "./collection";
import { analyzeStrategy, collectionCandidates, parseAdvisorDeck, rankDeckCandidates, upgradeDeck } from "./deck-advisor";
import { assessDeck, cardsById, ownedInventory, type FxSnapshot } from "./deck-builder";
import { selectReferences } from "./deck-quality";
import type { DeckVersion } from "./deck-records";
import type { PriceSnapshot } from "./prices";

export type AdvisorContext = {
  rows: InventoryRow[];
  version: number;
  prices: PriceSnapshot | null;
  priceError: string | null;
  fx: FxSnapshot | null;
  fxError: string | null;
  rulesCheckedAt: string | null;
  rulesError: string | null;
  versionsFor?: (deckId: string) => DeckVersion[] | Promise<DeckVersion[]>;
};

export async function runAdvisor(body: Record<string, unknown>, ctx: AdvisorContext): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    if (!body || typeof body !== "object" || !["analyze", "build", "releases"].includes(String(body.action))) throw new Error("Choose a supported adviser action.");
    const budget = typeof body.budget === "number" ? body.budget : 0;
    if (!Number.isFinite(budget) || budget < 0 || budget > 100000) throw new Error("Enter a budget between 0 and 100,000 SEK.");
    const extras = body.extras ?? {};
    if (!extras || typeof extras !== "object" || Array.isArray(extras) || Object.keys(extras).length > 100 || !Object.entries(extras).every(([id, quantity]) => cardsById.has(id) && typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 1000)) throw new Error("Invalid temporary card counts.");
    const owned = ownedInventory(displayCards(ctx.rows), extras as Record<string, number>);
    const warnings = [ctx.priceError, ctx.fxError, ctx.rulesError].filter((warning): warning is string => Boolean(warning));
    if (body.action === "releases") {
      if (typeof body.deckText !== "string") throw new Error("Paste a deck list first.");
      const parsed = parseAdvisorDeck("Deck", body.deckText);
      if (parsed.unmatched.length) throw new Error("Resolve unmatched lines before checking releases.");
      let ids: string[] | undefined;
      if (typeof body.deckId === "string" && ctx.versionsFor) ids = (await ctx.versionsFor(body.deckId)).at(-1)?.snapshot.cardIds;
      let records;
      let cachedSnapshot = false;
      try {
        const feed = await loadReleaseCards();
        records = feed.records;
      } catch (error) {
        records = previewSnapshot();
        cachedSnapshot = true;
        warnings.push(error instanceof Error ? `${error.message} Showing the saved card-feed preview instead.` : "Showing the saved card-feed preview instead.");
      }
      const releases = compareRelease(parsed.deck, records, ids);
      if (cachedSnapshot) releases.note = `${releases.note} The live gallery feed was unavailable, so this uses the saved preview.`;
      return { ok: true, data: { releases, warnings } };
    }
    if (body.action === "build") {
      if (typeof body.legendId !== "string" || (body.legendId !== "any" && cardsById.get(body.legendId)?.type !== "Legend")) throw new Error("Choose a Legend.");
      const favourites = Array.isArray(body.favouriteIds) ? body.favouriteIds : [];
      if (favourites.length > 6 || !favourites.every((id) => typeof id === "string" && cardsById.has(id))) throw new Error("Choose up to six known favourites.");
      if (!ctx.rulesCheckedAt) throw new Error(warnings.join(" ") || "Current rules could not be verified.");
      const legendIds = body.legendId === "any" ? Object.keys(owned).filter((id) => owned[id] > 0 && cardsById.get(id)?.type === "Legend") : [body.legendId];
      const proposals = legendIds.flatMap((id) => collectionCandidates(id, owned, ctx.prices, ctx.fx, budget).map((candidate) => candidate.deck)).filter((deck) => favourites.every((id) => deck.entries.some((entry) => entry.cardId === id && ["main", "chosen"].includes(entry.section))));
      const ranked = rankDeckCandidates(proposals, owned, ctx.prices, ctx.fx, budget);
      const diverse = body.legendId === "any" ? [...new Map(ranked.slice().reverse().map((candidate) => [candidate.deck.entries.find((entry) => entry.section === "legend")!.cardId, candidate])).values()].sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b)) : ranked;
      const candidates = diverse.slice(0, 5);
      const runeCoverage = legendIds.map((id) => ({ legendId: id, copies: Object.entries(owned).reduce((sum, [cardId, quantity]) => sum + (cardsById.get(cardId)?.type === "Rune" && cardsById.get(cardId)!.domains.every((domain) => cardsById.get(id)!.domains.includes(domain)) ? quantity : 0), 0) }));
      return { ok: true, data: { candidates, runeCoverage, warnings, temporaryCounts: extras, collectionVersion: ctx.version, pricesAt: ctx.prices?.createdAt ?? null, fxAt: ctx.fx?.date ?? null, rulesCheckedAt: ctx.rulesCheckedAt } };
    }
    if (typeof body.deckText !== "string" || body.deckText.length > 20000) throw new Error("Paste a deck list of up to 20,000 characters.");
    const parsed = parseAdvisorDeck(typeof body.name === "string" ? body.name.slice(0, 80) : "Deck", body.deckText);
    if (!parsed.deck.entries.length) throw new Error("No cards could be identified.");
    const legendId = parsed.deck.entries.find((entry) => entry.section === "legend")?.cardId;
    const refs = legendId ? selectReferences(legendId) : [];
    const ref = typeof body.referenceId === "string" && body.referenceId ? refs.find((item) => item.id === body.referenceId) : undefined;
    if (body.referenceId && !ref) throw new Error("That reference is not valid for this Legend.");
    const assessment = assessDeck(parsed.deck.entries, owned, ctx.prices, ctx.fx, budget);
    const analysis = analyzeStrategy(parsed.deck, ref);
    const upgrades = !parsed.unmatched.length && ctx.rulesCheckedAt ? upgradeDeck(parsed.deck, owned, ctx.prices, ctx.fx, budget, ref) : { before: analysis, packages: [], blocked: parsed.unmatched.length ? "Resolve unmatched lines before applying upgrades." : "Current rules could not be verified." };
    return { ok: true, data: { analysis, assessment, upgrades, unmatched: parsed.unmatched, notices: parsed.notices, references: refs.map((item) => ({ id: item.id, name: item.name, strategy: item.strategy, source: item.source })), warnings, collectionVersion: ctx.version, pricesAt: ctx.prices?.createdAt ?? null, fxAt: ctx.fx?.date ?? null, rulesCheckedAt: ctx.rulesCheckedAt } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The adviser is temporarily unavailable." };
  }
}
