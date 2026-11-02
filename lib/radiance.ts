import type { CatalogCard } from "./collection";

/** Printed Radiance set size from riftbound-cards collector numbers (`001-167` through `167-167`). Higher numbers are over-numbered. */
export const RADIANCE_BASE_COUNT = 167;

export function isRadianceCatalogComplete(cards: readonly Pick<CatalogCard, "set" | "number">[]): boolean {
  const numbers = new Set(cards.filter((card) => card.set === "Radiance" && /^\d+$/.test(card.number) && Number(card.number) >= 1 && Number(card.number) <= RADIANCE_BASE_COUNT).map((card) => Number(card.number)));
  return numbers.size === RADIANCE_BASE_COUNT;
}
