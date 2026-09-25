import assert from "node:assert/strict";
import { test } from "node:test";
import initial from "../data/initial-inventory.json";
import { compareInventories, exportCsv, parseCardNexusCsv } from "../lib/collection";

test("supplied Card Nexus inventory survives CSV export and repeated import", () => {
  const parsed = parseCardNexusCsv(exportCsv(initial.headers, initial.rows));
  assert.deepEqual(parsed, initial);
  const difference = compareInventories(initial.rows, parsed.rows);
  assert.equal(difference.newCards.length, 0);
  assert.equal(difference.newFoils.length, 0);
  assert.equal(difference.moreCopies.length, 0);
  assert.equal(difference.removedCopies, 0);
});
