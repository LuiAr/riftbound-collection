import assert from "node:assert/strict";
import { test } from "node:test";
import { displayCards } from "../lib/collection";
import { analyzeDeck, missingList } from "../lib/deck";

test("saved builder section headings do not become unmatched cards", () => {
  const result = analyzeDeck("legend\n1 Rogue Assassin\nchosen\n1 Akali, Deadly Weapon\nmain\n3 Watchful Sentry\nrunes\n8 Order Rune\nbattlefields\n1 Windswept Hillock\nsideboard\n1 Hidden Blade", displayCards([]), { hideRunes: false });
  assert.deepEqual(result.unmatched, []);
  assert.equal(result.matches.length, 6);
  assert.equal(result.matches.reduce((sum, item) => sum + item.required, 0), 15);
  assert.equal(result.matches.find(item => item.name === "Order Rune")?.category, "runes");
  assert.equal(analyzeDeck("main\n1 Unknown card", displayCards([])).unmatched[0], "1 Unknown card");
});

const example = `Legend:
1 LeBlanc, Deceiver

Champion:
1 LeBlanc, Fragmented

MainDeck:
3 Watchful Sentry
3 Cull the Weak
3 Hidden Blade
3 Soaring Scout
3 Deathgrip
3 Glasc Mixologist
3 Ruined Rex
3 Mirror Image
2 Thousand-Tailed Watcher
2 Honest Broker
1 Stupefy
1 B.F. Sword
1 Chakram Dancer
1 Black Rose Dignitary
1 Sacrifice
1 Ki Barrier
3 Karthus, Eternal
1 Vi, Peacekeeper
1 Kennen, Keeper of Balance

Battlefields:
1 Windswept Hillock
1 Dusk Rose Lab
1 Star Spring

Runes:
8 Order Rune
4 Mind Rune`;

test("matches the supplied deck format and leaves runes out by default", () => {
  const cards = displayCards([
    { totalQtyOwned: "2", productId: "", name: "Watchful Sentry", printNumber: "096", finish: "Normal", expansion: "Origins" },
    { totalQtyOwned: "1", productId: "", name: "Kennen - Keeper of Balance", printNumber: "135", finish: "Foil", expansion: "Vendetta" },
  ]);
  const result = analyzeDeck(example, cards);
  assert.deepEqual(result.unmatched, []);
  assert.equal(result.matches.length, 24);
  assert.equal(result.matches.find((item) => item.name === "Watchful Sentry")?.missing, 1);
  assert.equal(result.matches.find((item) => item.name === "Kennen, Keeper of Balance")?.missing, 0);
  assert.equal(result.matches.find((item) => item.name === "LeBlanc, Deceiver")?.missing, 1);
  assert.doesNotMatch(missingList(result.matches), /Rune/);
  assert.match(missingList(result.matches), /1x LeBlanc, Fragmented/);
  assert.equal(analyzeDeck(example, cards, { hideRunes: false }).matches.length, 26);
});

test("matches card codes and can exclude token sections", () => {
  const cards = displayCards([]);
  const result = analyzeDeck("MainDeck:\n3x OGN-096 Watchful Sentry\n1 Bird\nTokens:\n2 Shadow Clone", cards);
  assert.deepEqual(result.unmatched, []);
  assert.equal(missingList(result.matches), "3x Watchful Sentry");
  assert.equal(missingList(analyzeDeck("1 Bird", cards, { hideTokens: false }).matches), "1x Bird");
});
