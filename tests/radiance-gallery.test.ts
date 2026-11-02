import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { cardsForCollectionView, catalog, parseCardNexusCsv, type CatalogCard, type DisplayCard } from "../lib/collection";
import { deckCopyGoals, deckCopyLimit } from "../lib/deck-copy-limit";
import { oneOfEachGoal } from "../lib/goals";
import { isRadianceCatalogComplete, RADIANCE_BASE_COUNT } from "../lib/radiance";
import { radianceCatalogFromFeed } from "../lib/radiance-feed";

const collection = parseCardNexusCsv(readFileSync("data/collection.csv", "utf8"));

test("the public Radiance feed supplies images and rarity without inventing either", () => {
  const parsed = radianceCatalogFromFeed([
    { cardSet: "Radiance", cardCode: "rad-068a-167", name: "Orianna", cardNumber: "068a-167", rarity: "Showcase", domains: ["Order", "Not a domain"], imageUrl: "https://example.test/orianna.png", scrapedAt: "2026-10-28T00:00:00.000Z" },
    { cardSet: "Radiance", cardCode: "rad-002-167", name: "Missing rarity", cardNumber: "002-167", rarity: "Mythic", domains: [], imageUrl: "https://example.test/nope.png" },
    { cardSet: "Vendetta", cardCode: "ven-001-166", name: "Other", cardNumber: "001", rarity: "Common", domains: ["Fury"], imageUrl: "https://example.test/other.png" },
  ]);
  assert.equal(parsed.cards.length, 1);
  assert.equal(parsed.cards[0]?.number, "068a");
  assert.deepEqual(parsed.cards[0]?.domains, ["Order"]);
  assert.equal(parsed.scrapedAt, "2026-10-28T00:00:00.000Z");
});

test("owned Radiance printings use the checklist, and the promo stays on the CSV", () => {
  assert.equal(RADIANCE_BASE_COUNT, 167);
  assert.equal(isRadianceCatalogComplete(catalog), true);
  const cards = cardsForCollectionView(collection.rows);
  const owned = cards.filter((card) => card.set === "Radiance" && card.quantity > 0);
  assert.equal(owned.length, 147);
  assert.ok(owned.every((card) => card.image?.startsWith("https://") && card.rarity !== "Unknown" && !card.extra));
  const blind = owned.find((card) => card.name === "Hunting Blind");
  assert.equal(blind?.quantity, 1);
  assert.equal(blind?.foilQuantity, 1);
  assert.deepEqual(blind?.nexusPrice, { standard: null, foil: 0.9 });
  const tracker = owned.find((card) => card.name === "Bilgewater Tracker");
  assert.equal(tracker?.quantity, 8);
  assert.equal(tracker?.foilQuantity, 1);
  assert.deepEqual(tracker?.nexusPrice, { standard: 0.05, foil: 0.1 });
  const promo = cards.find((card) => card.set === "Radiance Promos");
  assert.equal(promo?.name, "Heimerdinger - Academy Instructor (Pre-Rift)");
  assert.equal(promo?.number, "132");
  assert.equal(promo?.rarity, "Unknown");
  assert.equal(promo?.image, null);
  assert.equal(promo?.quantity, 1);
  assert.equal(promo?.foilQuantity, 1);
  assert.equal(promo?.extra, true);
  assert.deepEqual(promo?.nexusPrice, { standard: null, foil: 0.15 });
  assert.equal(cards.find((card) => card.set === "Radiance" && card.number === "132")?.quantity, 0);
  const overnumbered = cards.find((card) => card.set === "Radiance" && card.number === "176");
  assert.equal(overnumbered?.rarity, "Showcase");
  assert.equal(overnumbered && Number(overnumbered.number) > RADIANCE_BASE_COUNT, true);
  assert.equal(deckCopyLimit(owned[0]!), null);
  assert.equal(deckCopyGoals(owned).size, 0);
});

test("one of each counts Radiance numbers 1 through 167 and leaves out the promo", () => {
  const cards = cardsForCollectionView(collection.rows);
  const goal = oneOfEachGoal(cards, "Radiance");
  const expected = catalog.filter((card) => card.set === "Radiance" && /^\d+$/.test(card.number) && Number(card.number) >= 1 && Number(card.number) <= RADIANCE_BASE_COUNT && ["Common", "Uncommon", "Rare"].includes(card.rarity));
  assert.equal(goal.total, expected.length);
  assert.equal(goal.total, 139);
  assert.ok(goal.missing.every((card) => card.set === "Radiance" && !card.extra));
  assert.equal(goal.missing.some((card) => card.number === "132" && card.name === "Heimerdinger"), true);
  assert.equal(goal.missing.some((card) => card.name.includes("Pre-Rift")), false);
  assert.equal(oneOfEachGoal(cards, "Radiance Promos").total, 0);
  const sample: DisplayCard = { code: "rad-001-167", name: "Amateur Demolitionist", set: "Radiance", number: "001", rarity: "Common", domains: ["Chaos"], image: null, quantity: 1, foilQuantity: 0 };
  assert.equal(oneOfEachGoal([sample], "Radiance", { includeRadiance: false }).total, 0);
  assert.equal(oneOfEachGoal([sample], "All sets", { includeRadiance: true }).total, 1);
});

test("a Radiance row missing from the checklist keeps the CSV fields and a placeholder", () => {
  const partial: CatalogCard[] = [{ code: "rad-001-167", name: "Amateur Demolitionist", set: "Radiance", number: "001", rarity: "Common", domains: ["Chaos"], image: "https://example.test/a.png" }];
  const rows = [{ expansion: "Radiance", name: "Not In List", printNumber: "999", totalQtyOwned: "2", finish: "Foil", price: "1.25", productId: "x", game: "Riftbound" }];
  const view = cardsForCollectionView(rows, partial);
  assert.equal(view.some((card) => card.code === "rad-001-167"), false);
  const extra = view.find((card) => card.name === "Not In List");
  assert.equal(extra?.set, "Radiance");
  assert.equal(extra?.number, "999");
  assert.equal(extra?.rarity, "Unknown");
  assert.equal(extra?.image, null);
  assert.equal(extra?.quantity, 2);
  assert.equal(extra?.foilQuantity, 2);
  assert.deepEqual(extra?.nexusPrice, { standard: null, foil: 1.25 });
  assert.equal(oneOfEachGoal(view, "All sets").total, 0);
});
