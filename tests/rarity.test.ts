import assert from "node:assert/strict";
import { test } from "node:test";
import type { DisplayCard } from "../lib/collection";
import { matchesCardType, rarityFor } from "../lib/rarity";

const base: DisplayCard = { code: "test", name: "Test card", set: "Vendetta", number: "001", rarity: "Rare", domains: [], image: null, quantity: 0, foilQuantity: 0 };

test("multiple selected rarities combine while an empty selection shows all", () => {
  assert.equal(matchesCardType(base, [], false, false), true);
  assert.equal(matchesCardType({ ...base, rarity: "Epic" }, [], false, false), true);
  const basic = ["common", "uncommon", "rare"] as const;
  assert.equal(matchesCardType(base, basic, false, false), true);
  assert.equal(matchesCardType({ ...base, rarity: "Common" }, basic, false, false), true);
  assert.equal(matchesCardType({ ...base, rarity: "Epic" }, basic, false, false), false);
  assert.equal(matchesCardType({ ...base, number: "167" }, basic, false, false), false);
  assert.equal(matchesCardType({ ...base, number: "001a" }, basic, false, false), false);
  assert.equal(matchesCardType({ ...base, rarity: "Showcase" }, basic, false, false), false);
});

test("special rarity and individual exclusions agree with the printing filters", () => {
  const overnumbered = { ...base, number: "167" };
  const alternate = { ...base, number: "001a" };
  assert.equal(rarityFor(overnumbered)?.kind, "special");
  assert.equal(rarityFor(alternate)?.kind, "special");
  assert.equal(matchesCardType(overnumbered, ["rare", "special"], false, false), true);
  assert.equal(matchesCardType(overnumbered, ["rare", "special"], false, true), false);
  assert.equal(matchesCardType(alternate, ["special"], true, false), false);
});
