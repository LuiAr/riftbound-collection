import { getChatGPTUser } from "../../chatgpt-auth";
import { getCollection } from "../../../lib/server-collection";
import { displayCards } from "../../../lib/collection";
import { ownedInventory, assessDeck, cardsById } from "../../../lib/deck-builder";
import { analyzeStrategy, collectionCandidates, parseAdvisorDeck, rankDeckCandidates, upgradeDeck } from "../../../lib/deck-advisor";
import { selectReferences } from "../../../lib/deck-quality";
import { loadPrices } from "../../../lib/server-prices";
import { loadFx, verifyCurrentRules } from "../../../lib/server-builder";
import { compareRelease, loadReleaseCards } from "../../../lib/card-releases";
import { getDeckVersions } from "../../../lib/server-decks";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to use the deck adviser." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const text = await request.text(); if (text.length > 25000) throw new Error("This deck request is too large.");
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || !["analyze", "build", "releases"].includes(body.action)) throw new Error("Choose a supported adviser action.");
    const budget = body.budget ?? 0;
    if (!Number.isFinite(budget) || budget < 0 || budget > 100000) throw new Error("Enter a budget between 0 and 100,000 SEK.");
    const collection = await getCollection(user.userId);
    const extras = body.extras ?? {};
    if (!extras || typeof extras !== "object" || Array.isArray(extras) || Object.keys(extras).length > 100 || !Object.entries(extras).every(([id, q]) => cardsById.has(id) && typeof q === "number" && Number.isSafeInteger(q) && q >= 0 && q <= 1000)) throw new Error("Invalid temporary card counts.");
    const owned = ownedInventory(displayCards(collection.rows), extras);
    if (body.action === "releases") {
      if (typeof body.deckText !== "string") throw new Error("Paste a deck list first.");
      const parsed = parseAdvisorDeck("Deck", body.deckText);
      if (parsed.unmatched.length) throw new Error("Resolve unmatched lines before checking releases.");
      let ids: string[] | undefined;
      if (typeof body.deckId === "string") {
        const versions = await getDeckVersions(user.userId, body.deckId);
        ids = versions.at(-1)?.snapshot.cardIds;
      }
      const feed = await loadReleaseCards();
      return Response.json({ releases: compareRelease(parsed.deck, feed.records, ids) }, { headers: { "cache-control": "private, no-store" } });
    }
    const [priceResult, fxResult, ruleResult] = await Promise.allSettled([loadPrices(), loadFx(), verifyCurrentRules()]);
    const prices = priceResult.status === "fulfilled" ? priceResult.value : null;
    const fx = fxResult.status === "fulfilled" ? fxResult.value : null;
    const warnings = [priceResult, fxResult, ruleResult].flatMap(r => r.status === "rejected" ? [r.reason instanceof Error ? r.reason.message : "A current data source is unavailable."] : []);
    if (body.action === "build") {
      if (typeof body.legendId !== "string" || body.legendId !== "any" && cardsById.get(body.legendId)?.type !== "Legend") throw new Error("Choose a Legend.");
      const favourites = body.favouriteIds ?? [];
      if (!Array.isArray(favourites) || favourites.length > 6 || !favourites.every(id => typeof id === "string" && cardsById.has(id))) throw new Error("Choose up to six known favourites.");
      if (ruleResult.status !== "fulfilled") throw new Error(warnings.join(" "));
      const legendIds = body.legendId === "any" ? Object.keys(owned).filter(id => owned[id] > 0 && cardsById.get(id)?.type === "Legend") : [body.legendId];
      const proposals = legendIds.flatMap(id => collectionCandidates(id, owned, prices, fx, budget).map(c => c.deck)).filter(d => favourites.every(id => d.entries.some(e => e.cardId === id && ["main", "chosen"].includes(e.section))));
      const ranked = rankDeckCandidates(proposals, owned, prices, fx, budget);
      const diverse = body.legendId === "any" ? [...new Map(ranked.slice().reverse().map(c => [c.deck.entries.find(e => e.section === "legend")!.cardId, c])).values()].sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b)) : ranked;
      const candidates = diverse.slice(0, 5);
      const runeCoverage = legendIds.map(id => ({ legendId: id, copies: Object.entries(owned).reduce((sum, [cardId, q]) => sum + (cardsById.get(cardId)?.type === "Rune" && cardsById.get(cardId)!.domains.every(d => cardsById.get(id)!.domains.includes(d)) ? q : 0), 0) }));
      return Response.json({ candidates, runeCoverage, warnings, temporaryCounts: extras, collectionVersion: collection.version, pricesAt: prices?.createdAt ?? null, fxAt: fx?.date ?? null, rulesCheckedAt: ruleResult.value }, { headers: { "cache-control": "private, no-store" } });
    }
    if (typeof body.deckText !== "string" || body.deckText.length > 20000) throw new Error("Paste a deck list of up to 20,000 characters.");
    const parsed = parseAdvisorDeck(typeof body.name === "string" ? body.name.slice(0, 80) : "Deck", body.deckText);
    if (!parsed.deck.entries.length) throw new Error("No cards could be identified.");
    const legendId = parsed.deck.entries.find(e => e.section === "legend")?.cardId;
    const refs = legendId ? selectReferences(legendId) : [];
    const ref = typeof body.referenceId === "string" && body.referenceId ? refs.find(r => r.id === body.referenceId) : undefined;
    if (body.referenceId && !ref) throw new Error("That reference is not valid for this Legend.");
    const assessment = assessDeck(parsed.deck.entries, owned, prices, fx, budget);
    const analysis = analyzeStrategy(parsed.deck, ref);
    const upgrades = !parsed.unmatched.length && ruleResult.status === "fulfilled" ? upgradeDeck(parsed.deck, owned, prices, fx, budget, ref) : { before: analysis, packages: [], blocked: parsed.unmatched.length ? "Resolve unmatched lines before applying upgrades." : "Current rules could not be verified." };
    return Response.json({ analysis, assessment, upgrades, unmatched: parsed.unmatched, notices: parsed.notices, references: refs.map(r => ({ id: r.id, name: r.name, strategy: r.strategy, source: r.source })), warnings, collectionVersion: collection.version, pricesAt: prices?.createdAt ?? null, fxAt: fx?.date ?? null, rulesCheckedAt: ruleResult.status === "fulfilled" ? ruleResult.value : null }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The adviser is temporarily unavailable." }, { status: 400 }); }
}
