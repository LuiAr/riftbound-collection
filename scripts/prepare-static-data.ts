import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseCardNexusCsv } from "../lib/collection";
import type { CollectionSnapshot, GeneratedCollection } from "../lib/collection-snapshot";
import { loadFx, verifyCurrentRules } from "../lib/live-market";
import { loadPrices } from "../lib/server-prices";
import type { GeneratedMarket } from "../lib/site-market";

const exportNames = readdirSync("data/exports").filter((name) => /^\d{4}-\d{2}-\d{2}\.csv$/.test(name)).sort();
if (!exportNames.length) throw new Error("Add at least one data/exports/YYYY-MM-DD.csv snapshot.");
if (!existsSync("data/collection.csv")) throw new Error("data/collection.csv is missing. Copy the latest Card Nexus export there.");

const snapshots: CollectionSnapshot[] = exportNames.map((name, index) => {
  const date = name.slice(0, 10);
  const parsed = parseCardNexusCsv(readFileSync(`data/exports/${name}`, "utf8"));
  return { importId: date, version: index + 1, importedAt: `${date}T12:00:00.000Z`, sourceName: `Card Nexus export ${date}`, headers: parsed.headers, rows: parsed.rows };
});

const currentParsed = parseCardNexusCsv(readFileSync("data/collection.csv", "utf8"));
const sameRows = (left: { headers: string[]; rows: Record<string, string>[] }, right: { headers: string[]; rows: Record<string, string>[] }) => JSON.stringify(left.headers) === JSON.stringify(right.headers) && JSON.stringify(left.rows) === JSON.stringify(right.rows);
const matched = [...snapshots].reverse().find((snapshot) => sameRows(snapshot, currentParsed));
let currentId = matched?.importId ?? "";
if (!matched) {
  currentId = "collection-csv";
  snapshots.push({ importId: currentId, version: snapshots.length + 1, importedAt: null, sourceName: "data/collection.csv (copy it to data/exports/YYYY-MM-DD.csv to date this scan)", headers: currentParsed.headers, rows: currentParsed.rows });
}

const collection: GeneratedCollection = { currentId, snapshots };
mkdirSync("data/generated", { recursive: true });
writeFileSync("data/generated/collection.json", JSON.stringify(collection));

const marketPath = "data/generated/market.json";
const previous: Partial<GeneratedMarket> = existsSync(marketPath) ? JSON.parse(readFileSync(marketPath, "utf8")) as Partial<GeneratedMarket> : {};
const market: GeneratedMarket = { prices: previous.prices ?? null, priceError: previous.priceError ?? null, fx: previous.fx ?? null, fxError: previous.fxError ?? null, rulesCheckedAt: previous.rulesCheckedAt ?? null, rulesError: previous.rulesError ?? null };

try {
  const prices = await loadPrices({ allowStale: true });
  market.prices = prices;
  const age = Date.now() - Date.parse(prices.createdAt);
  market.priceError = age > 3 * 24 * 60 * 60 * 1000 ? "The embedded Cardmarket guide is more than three days old. Rebuild the site to refresh it." : null;
} catch (error) {
  market.priceError = error instanceof Error ? error.message : "Cardmarket prices could not be downloaded.";
  if (!market.prices) market.prices = null;
}

try {
  const fx = await loadFx({ allowStale: true });
  market.fx = fx;
  const age = Date.now() - Date.parse(fx.date);
  market.fxError = age > 7 * 24 * 60 * 60 * 1000 ? "The embedded euro exchange rate is more than seven days old." : null;
} catch (error) {
  market.fxError = error instanceof Error ? error.message : "Exchange rates are unavailable.";
}

try {
  market.rulesCheckedAt = await verifyCurrentRules();
  market.rulesError = null;
} catch (error) {
  market.rulesCheckedAt = null;
  market.rulesError = error instanceof Error ? error.message : "Current rules could not be verified.";
}

writeFileSync(marketPath, JSON.stringify(market));
console.log(JSON.stringify({ currentId, snapshots: snapshots.map((snapshot) => ({ id: snapshot.importId, rows: snapshot.rows.length })), priceQuotes: market.prices ? Object.keys(market.prices.quotes).length : 0, priceError: market.priceError, fx: market.fx?.date ?? null, fxError: market.fxError, rulesCheckedAt: market.rulesCheckedAt, rulesError: market.rulesError }));
