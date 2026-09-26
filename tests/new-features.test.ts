import assert from "node:assert/strict";
import { test } from "node:test";
import { setForExpansion, type DisplayCard, type InventoryRow } from "../lib/collection";
import { oneOfEachGoal } from "../lib/goals";
import { compareVersions } from "../lib/history-diff";
import { isRadianceCatalogComplete } from "../lib/radiance";

const row = (productId: string, name: string, quantity: number, finish = "Standard"): InventoryRow => ({ expansion: "Vendetta - Main Set", productId, name, printNumber: productId, totalQtyOwned: String(quantity), finish });
const card = (number: string, rarity: string, quantity = 0, set = "Vendetta"): DisplayCard => ({ code: `${set}-${number}`, name: `${set} ${number}`, set, number, rarity, quantity, foilQuantity: 0, image: null, domains: [] });

test("history comparison keeps exact products and standard/foil counts separate", () => {
  const before = [row("001", "First", 2), row("001", "First", 1, "Foil"), row("002", "Second", 1)];
  const after = [row("001", "First", 1), row("001", "First", 2, "Foil"), row("003", "Third", 1, "Foil")];
  const result = compareVersions(before, after);
  assert.deepEqual([result.added, result.removed, result.changed], [1, 1, 1]);
  const changed = result.changes.find((item) => item.name === "First")!;
  assert.equal(changed.kind, "changed");
  assert.deepEqual(changed.before, { standard: 2, foil: 1 });
  assert.deepEqual(changed.after, { standard: 1, foil: 2 });
  assert.equal(result.changes.find((item) => item.name === "Second")?.kind, "removed");
  assert.equal(result.changes.find((item) => item.name === "Third")?.kind, "added");
});

test("one-of-each goal excludes Epic and special printings", () => {
  const cards = [card("001", "Common", 1), card("002", "Uncommon"), card("003", "Rare"), card("004", "Epic"), card("005a", "Common"), card("167", "Rare"), card("006", "Showcase"), card("r01", "Common"), { ...card("007", "Common", 1, "Vendetta Promos"), extra: true }];
  const result = oneOfEachGoal(cards, "All sets");
  assert.deepEqual([result.owned, result.total], [1, 3]);
  assert.deepEqual(result.missing.map((item) => item.number), ["002", "003"]);
  assert.equal(oneOfEachGoal(cards, "Origins").total, 0);
});

test("Radiance remains hidden until all 180 regular numbers exist", () => {
  const partial = Array.from({ length: 179 }, (_, index) => ({ set: "Radiance", number: String(index + 1).padStart(3, "0") }));
  assert.equal(isRadianceCatalogComplete(partial), false);
  assert.equal(isRadianceCatalogComplete([...partial, { set: "Radiance", number: "179" }]), false);
  assert.equal(isRadianceCatalogComplete([...partial, { set: "Radiance", number: "180" }]), true);
  assert.equal(setForExpansion("Radiance - Main Set"), "Radiance");
});
