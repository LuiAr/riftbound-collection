import assert from "node:assert/strict";
import { test } from "node:test";
import type { DisplayCard } from "../lib/collection";
import { matchesCardType, rarityFor } from "../lib/rarity";

const base: DisplayCard = { code: "test", name: "Test card", set: "Vendetta", number: "001", rarity: "Rare", domains: [], image: null, quantity: 0, foilQuantity: 0 };

test("normal cards exclude Epic and every special printing while retaining base rarities", () => {
  assert.equal(matchesCardType(base, "normal", false, false), true);
  assert.equal(matchesCardType({ ...base, rarity: "Common" }, "normal", false, false), true);
  assert.equal(matchesCardType({ ...base, rarity: "Epic" }, "normal", false, false), false);
  assert.equal(matchesCardType({ ...base, number: "167" }, "normal", false, false), false);
  assert.equal(matchesCardType({ ...base, number: "001a" }, "normal", false, false), false);
  assert.equal(matchesCardType({ ...base, rarity: "Showcase" }, "normal", false, false), false);
});

test("special icon and individual exclusions agree with the printing filters", () => {
  const overnumbered = { ...base, number: "167" };
  const alternate = { ...base, number: "001a" };
  assert.equal(rarityFor(overnumbered)?.kind, "special");
  assert.equal(rarityFor(alternate)?.kind, "special");
  assert.equal(matchesCardType(overnumbered, "special", false, false), true);
  assert.equal(matchesCardType(overnumbered, "special", false, true), false);
  assert.equal(matchesCardType(alternate, "special", true, false), false);
});
