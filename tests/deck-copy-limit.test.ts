import assert from "node:assert/strict";
import { test } from "node:test";
import { catalog, displayCards, type DisplayCard, type InventoryRow } from "../lib/collection";
import { deckCardKey, deckCopyGoals, deckCopyLimit } from "../lib/deck-copy-limit";

function card(code: string, quantity = 0): DisplayCard {
  const found = catalog.find((item) => item.code === code);
  assert.ok(found, `Missing catalog card ${code}`);
  return { ...found, quantity, foilQuantity: 0 };
}

test("deck targets group a named card across printings and sets", () => {
  const regular = card("ven-019-166", 1);
  const alternate = card("ven-019a-166", 1);
  const olderSet = card("ogn-039-298", 1);
  const newerSet = card("ven-sp1-006", 1);
  const goals = deckCopyGoals([regular, alternate, olderSet, newerSet, card("ven-139-166"), card("ven-189-star-166", 1), card("ven-157-166")]);
  assert.deepEqual(goals.get(deckCardKey(regular)), { name: "Renekton, Rage Fueled", limit: 3, owned: 2, missing: 1 });
  assert.deepEqual(goals.get(deckCardKey(olderSet)), { name: "Kai'Sa, Survivor", limit: 3, owned: 2, missing: 1 });
  assert.deepEqual(goals.get(deckCardKey(card("ven-139-166"))), { name: "Rogue Assassin", limit: 1, owned: 1, missing: 0 });
  assert.deepEqual(goals.get(deckCardKey(card("ven-157-166"))), { name: "Dragon Roost", limit: 1, owned: 0, missing: 1 });
});

test("runes and tokens do not appear in the needs-copies goal", () => {
  const rune = card("ven-r01", 1);
  const token = card("ven-t04", 0);
  const goals = deckCopyGoals([rune, token]);
  assert.equal(goals.size, 0);
  assert.equal(deckCopyLimit(rune), 12);
  assert.equal(deckCopyLimit(token), null);
});

test("matching Vendetta promo entries add to the regular card without changing source rows", () => {
  const rows: InventoryRow[] = [
    { expansion: "Vendetta", name: "Ol' Poro", printNumber: "029", productId: "regular", totalQtyOwned: "1", finish: "Standard" },
    { expansion: "Vendetta - Promo Cards", name: "Ol' Poro", printNumber: "029", productId: "promo", totalQtyOwned: "1", finish: "Standard" },
  ];
  const cards = displayCards(rows);
  assert.equal(cards.find((item) => item.code === "ven-029-166")?.quantity, 2);
  assert.equal(cards.some((item) => item.set === "Vendetta Promos"), false);
  assert.equal(rows[1].expansion, "Vendetta - Promo Cards");
});
