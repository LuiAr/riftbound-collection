import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseCardNexusCsv } from "../lib/collection";

test("current collection file is the November 2026 Card Nexus export", () => {
  const current = parseCardNexusCsv(readFileSync("data/collection.csv", "utf8"));
  const dated = parseCardNexusCsv(readFileSync("data/exports/2026-11-01.csv", "utf8"));
  assert.equal(current.rows.length, 453);
  assert.deepEqual(current, dated);
  assert.ok(current.headers.includes("totalQtyOwned"));
  assert.ok(current.rows.every((row) => row.game.includes("Riftbound")));
});

test("September 24 export remains available for history", () => {
  const older = parseCardNexusCsv(readFileSync("data/exports/2026-09-24.csv", "utf8"));
  assert.equal(older.rows.length, 263);
});
