export type PriceQuote = {
  productId: number;
  standard: number | null;
  foil: number | null;
};

export type PriceSnapshot = {
  createdAt: string;
  quotes: Record<string, PriceQuote>;
};

export function priceKey(set: string, name: string): string {
  const normalized = name.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[^a-z0-9]/g, "");
  return `${set}|${normalized}`;
}
