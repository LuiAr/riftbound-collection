import type { InventoryRow } from "./collection";

type Counts = { standard: number; foil: number };
export type PrintingChange = {
  key: string; name: string; expansion: string; printNumber: string;
  before: Counts; after: Counts; kind: "added" | "removed" | "changed";
};
export type VersionComparison = { changes: PrintingChange[]; added: number; removed: number; changed: number };

function groupPrintings(rows: InventoryRow[]) {
  const grouped = new Map<string, Omit<PrintingChange, "before" | "after" | "kind"> & Counts>();
  for (const row of rows) {
    const product = row.productId || `${row.printNumber.trim().toLowerCase()}|${row.name.trim().toLowerCase()}|${row.variant || ""}`;
    const key = `${row.expansion}|${product}`;
    const item = grouped.get(key) ?? { key, name: row.name, expansion: row.expansion, printNumber: row.printNumber, standard: 0, foil: 0 };
    const quantity = Number(row.totalQtyOwned) || 0;
    if (row.finish.trim().toLowerCase().includes("foil")) item.foil += quantity;
    else item.standard += quantity;
    grouped.set(key, item);
  }
  return grouped;
}

export function compareVersions(beforeRows: InventoryRow[], afterRows: InventoryRow[]): VersionComparison {
  const before = groupPrintings(beforeRows);
  const after = groupPrintings(afterRows);
  const changes: PrintingChange[] = [];
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(key);
    const next = after.get(key);
    const beforeCounts = { standard: old?.standard ?? 0, foil: old?.foil ?? 0 };
    const afterCounts = { standard: next?.standard ?? 0, foil: next?.foil ?? 0 };
    if (beforeCounts.standard === afterCounts.standard && beforeCounts.foil === afterCounts.foil) continue;
    const kind = !old ? "added" : !next ? "removed" : "changed";
    changes.push({ key, name: next?.name ?? old!.name, expansion: next?.expansion ?? old!.expansion, printNumber: next?.printNumber ?? old!.printNumber, before: beforeCounts, after: afterCounts, kind });
  }
  changes.sort((a, b) => a.kind.localeCompare(b.kind) || a.expansion.localeCompare(b.expansion) || a.printNumber.localeCompare(b.printNumber, undefined, { numeric: true }) || a.name.localeCompare(b.name));
  return {
    changes,
    added: changes.filter((item) => item.kind === "added").length,
    removed: changes.filter((item) => item.kind === "removed").length,
    changed: changes.filter((item) => item.kind === "changed").length,
  };
}
