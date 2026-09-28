import catalogData from "../data/catalog.json";
import { RADIANCE_BASE_COUNT } from "./radiance";

export type InventoryRow = Record<string, string>;
export type CatalogCard = { code: string; name: string; set: string; number: string; rarity: string; domains: string[]; image: string | null };
export type DisplayCard = CatalogCard & { quantity: number; foilQuantity: number; extra?: boolean };
export const catalog = catalogData as CatalogCard[];
const regularSetTotals: Record<string, number> = { Vendetta: 166, Unleashed: 219, Spiritforged: 221, Origins: 298, "Proving Grounds": 24, Radiance: RADIANCE_BASE_COUNT };

export function isAlternatePrinting(card: DisplayCard): boolean {
  return /^(?:\d+|r\d+)a$/i.test(card.number.trim()) || (card.set === "Vendetta" && /^sp\d+$/i.test(card.number.trim()));
}

export function isOvernumbered(card: DisplayCard): boolean {
  const number = card.number.trim();
  return /^\d+$/.test(number) && Number(number) > (regularSetTotals[card.set] ?? Infinity);
}

export function hasFoilTreatment(card: DisplayCard): boolean {
  if (card.quantity === 0) return false;
  return card.foilQuantity > 0 || (card.set !== "Proving Grounds" && ((!card.extra && ["Rare", "Epic", "Showcase"].includes(card.rarity)) || isOvernumbered(card)));
}
export const CARD_NEXUS_COLUMNS = ["totalQtyOwned", "productId", "name", "printNumber", "finish", "variant", "expansion", "game", "condition", "language", "location", "tags", "comment", "notes", "price", "sellValue"];

export function parseCardNexusCsv(input: string): { headers: string[]; rows: InventoryRow[] } {
  const text = input.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let record: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { record.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field); field = "";
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
    } else field += char;
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted value.");
  record.push(field);
  if (record.some((value) => value !== "")) records.push(record);
  if (records.length < 2) throw new Error("This file has no collection rows.");
  const headers = records.shift()!.map((value) => value.trim());
  if (new Set(headers).size !== headers.length || headers.some((value) => !value)) throw new Error("The CSV has duplicate or empty column names.");
  for (const column of ["totalQtyOwned", "name", "printNumber", "finish", "expansion", "game"]) if (!headers.includes(column)) throw new Error(`Missing Card Nexus column: ${column}.`);
  if (records.length > 5000) throw new Error("This export is too large for one import (5,000 rows maximum).");
  const rows = records.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2} has a different number of columns.`);
    const row = Object.fromEntries(headers.map((key, i) => [key, values[i]]));
    const quantity = Number(row.totalQtyOwned);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(`Row ${index + 2} needs a positive whole-number quantity.`);
    if (!row.name.trim() || !row.printNumber.trim() || !row.expansion.trim()) throw new Error(`Row ${index + 2} is missing a card name, number, or set.`);
    if (!row.game.toLowerCase().includes("riftbound")) throw new Error(`Row ${index + 2} is not a Riftbound card.`);
    return row;
  });
  return { headers, rows };
}

export function exportCsv(headers: string[], rows: InventoryRow[]): string {
  const escape = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return "\uFEFF" + [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\r\n") + "\r\n";
}

export function setForExpansion(expansion: string): string {
  if (expansion === "Origins - Main Set") return "Origins";
  if (expansion === "Origins - Proving Grounds") return "Proving Grounds";
  if (expansion === "Vendetta - Promo Cards") return "Vendetta Promos";
  if (expansion === "Radiance - Main Set") return "Radiance";
  return expansion;
}

const numberKey = (value: string) => value.trim().toLowerCase().replace(/^0+(?=\d)/, "");
const catalogBySetNumber = new Map<string, CatalogCard>();
for (const card of catalog) {
  const key = `${card.set}|${numberKey(card.number)}`;
  if (!catalogBySetNumber.has(key) || (catalogBySetNumber.get(key)!.code.includes("-star-") && !card.code.includes("-star-"))) catalogBySetNumber.set(key, card);
}
export function findCatalogCard(row: InventoryRow): CatalogCard | undefined {
  const set = setForExpansion(row.expansion) === "Vendetta Promos" ? "Vendetta" : setForExpansion(row.expansion);
  const number = numberKey(row.printNumber);
  return catalogBySetNumber.get(`${set}|${number}`) ?? (number.endsWith("a") ? catalogBySetNumber.get(`${set}|${number.slice(0, -1)}`) : undefined);
}

export function displayCards(rows: InventoryRow[]): DisplayCard[] {
  const owned = new Map<string, { quantity: number; foilQuantity: number }>();
  const extras = new Map<string, DisplayCard>();
  for (const row of rows) {
    const quantity = Number(row.totalQtyOwned) || 0;
    const foil = row.finish.trim().toLowerCase().includes("foil") ? quantity : 0;
    const sourceSet = setForExpansion(row.expansion);
    const set = sourceSet === "Vendetta Promos" ? "Vendetta" : sourceSet;
    const candidate = catalogBySetNumber.get(`${set}|${numberKey(row.printNumber)}`);
    const exact = sourceSet !== "Vendetta Promos" || (candidate && candidate.name.trim().toLowerCase() === row.name.trim().toLowerCase()) ? candidate : undefined;
    if (exact) {
      const previous = owned.get(exact.code) ?? { quantity: 0, foilQuantity: 0 };
      owned.set(exact.code, { quantity: previous.quantity + quantity, foilQuantity: previous.foilQuantity + foil });
    } else {
      const key = `${set}|${numberKey(row.printNumber)}|${row.productId || row.name}`;
      const previous = extras.get(key);
      if (previous) { previous.quantity += quantity; previous.foilQuantity += foil; }
      else {
        const fallback = findCatalogCard(row);
        extras.set(key, { code: `extra:${key}`, name: row.name, set, number: row.printNumber, rarity: fallback?.rarity ?? "Unknown", domains: fallback?.domains ?? [], image: fallback?.image ?? null, quantity, foilQuantity: foil, extra: true });
      }
    }
  }
  return [...catalog.map((card) => ({ ...card, ...(owned.get(card.code) ?? { quantity: 0, foilQuantity: 0 }) })), ...extras.values()];
}

type Difference = { name: string; expansion: string; printNumber: string; quantity: number; foilQuantity: number };
export type ImportDifference = { newCards: Difference[]; newFoils: Difference[]; moreCopies: Difference[]; removedCopies: number; incomingRows: number; incomingCopies: number };
export function compareInventories(before: InventoryRow[], after: InventoryRow[]): ImportDifference {
  const group = (rows: InventoryRow[]) => {
    const map = new Map<string, Difference>();
    for (const row of rows) {
      const key = `${row.expansion}|${row.productId || `${numberKey(row.printNumber)}|${row.name.toLowerCase()}`}`;
      const value = map.get(key) ?? { name: row.name, expansion: row.expansion, printNumber: row.printNumber, quantity: 0, foilQuantity: 0 };
      const qty = Number(row.totalQtyOwned);
      value.quantity += qty;
      if (row.finish.trim().toLowerCase().includes("foil")) value.foilQuantity += qty;
      map.set(key, value);
    }
    return map;
  };
  const old = group(before), next = group(after);
  const result: ImportDifference = { newCards: [], newFoils: [], moreCopies: [], removedCopies: 0, incomingRows: after.length, incomingCopies: after.reduce((total, row) => total + Number(row.totalQtyOwned), 0) };
  for (const [key, item] of next) {
    const previous = old.get(key);
    if (!previous) result.newCards.push(item);
    else {
      const foilAdded = item.foilQuantity - previous.foilQuantity;
      const standardAdded = (item.quantity - item.foilQuantity) - (previous.quantity - previous.foilQuantity);
      if (foilAdded > 0) result.newFoils.push({ ...item, quantity: foilAdded });
      if (standardAdded > 0) result.moreCopies.push({ ...item, quantity: standardAdded });
    }
  }
  for (const [key, item] of old) {
    const current = next.get(key);
    result.removedCopies += Math.max(0, item.foilQuantity - (current?.foilQuantity ?? 0));
    result.removedCopies += Math.max(0, item.quantity - item.foilQuantity - ((current?.quantity ?? 0) - (current?.foilQuantity ?? 0)));
  }
  return result;
}
