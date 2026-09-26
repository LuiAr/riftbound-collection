import type { CatalogCard } from "./collection";

export const RADIANCE_BASE_COUNT = 180;

export function isRadianceCatalogComplete(cards: readonly Pick<CatalogCard, "set" | "number">[]): boolean {
  const numbers = new Set(cards.filter((card) => card.set === "Radiance" && /^\d+$/.test(card.number) && Number(card.number) >= 1 && Number(card.number) <= RADIANCE_BASE_COUNT).map((card) => Number(card.number)));
  return numbers.size === RADIANCE_BASE_COUNT;
}
