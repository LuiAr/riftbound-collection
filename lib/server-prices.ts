import builderData from "../data/builder-cards.json";
import { catalog } from "./collection";
import { priceKey, type PriceQuote, type PriceSnapshot } from "./prices";

const PRODUCTS_URL = "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_22.json";
const PRICES_URL = "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json";
const expansionSets: Record<number, string> = {
  6286: "Origins",
  6289: "Proving Grounds",
  6399: "Spiritforged",
  6491: "Unleashed",
  6587: "Vendetta",
  6588: "Vendetta Promos",
};

type Product = { idProduct: number; idExpansion: number; name: string; idMetacard?: number };
type Guide = { idProduct: number; avg7?: number | null; "avg7-foil"?: number | null };
let cached: { until: number; snapshot: PriceSnapshot } | null = null;

const saleAverage = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

export async function loadPrices(): Promise<PriceSnapshot> {
  if (cached && cached.until > Date.now()) return cached.snapshot;
  const [productsResponse, guidesResponse] = await Promise.all([
    fetch(PRODUCTS_URL, { signal: AbortSignal.timeout(12000) }),
    fetch(PRICES_URL, { signal: AbortSignal.timeout(12000) }),
  ]);
  if (!productsResponse.ok || !guidesResponse.ok) throw new Error("Cardmarket downloads are unavailable.");
  const productsData = await productsResponse.json() as { products?: Product[] };
  const guidesData = await guidesResponse.json() as { createdAt?: string; priceGuides?: Guide[] };
  if (!Array.isArray(productsData.products) || !Array.isArray(guidesData.priceGuides) || !guidesData.createdAt || !Number.isFinite(Date.parse(guidesData.createdAt))) throw new Error("Cardmarket downloads have an unexpected format.");
  if (Date.now() - Date.parse(guidesData.createdAt) > 3 * 24 * 60 * 60 * 1000) throw new Error("Cardmarket prices are older than three days.");

  const catalogCounts = new Map<string, number>();
  for (const card of catalog) {
    const key = priceKey(card.set, card.name);
    catalogCounts.set(key, (catalogCounts.get(key) ?? 0) + 1);
  }
  const productsByName = new Map<string, Product[]>();
  for (const product of productsData.products) {
    const set = expansionSets[product.idExpansion];
    if (!set || !Number.isSafeInteger(product.idProduct) || typeof product.name !== "string") continue;
    const key = priceKey(set, product.name);
    productsByName.set(key, [...(productsByName.get(key) ?? []), product]);
  }
  const guidesById = new Map(guidesData.priceGuides.map((guide) => [guide.idProduct, guide]));
  const quotes: Record<string, PriceQuote> = {};
  for (const [key, products] of productsByName) {
    if (products.length !== 1 || catalogCounts.get(key) !== 1) continue;
    const product = products[0];
    const guide = guidesById.get(product.idProduct);
    if (!guide) continue;
    const standard = saleAverage(guide.avg7);
    const foil = saleAverage(guide["avg7-foil"]);
    if (standard === null && foil === null) continue;
    quotes[key] = { productId: product.idProduct, standard, foil };
  }
  const playableOffers: NonNullable<PriceSnapshot["playableOffers"]> = {};
  for (const card of builderData.cards) {
    const names = [card.name, ...(card.type === "Legend" && card.tags[0] ? [`${card.tags[0]}, ${card.name}`] : [])];
    const sets = new Set(card.printings.map((code) => catalog.find((c) => c.code === code)?.set).filter((set): set is string => Boolean(set)));
    for (const set of sets) {
      const matches = names.flatMap((name) => productsByName.get(priceKey(set, name)) ?? []);
      const products = [...new Map(matches.map((p) => [p.idProduct, p])).values()];
      if (!products.length || (products.length > 1 && (!products.every((p) => Number.isSafeInteger(p.idMetacard)) || new Set(products.map((p) => p.idMetacard)).size !== 1))) continue;
      for (const product of products) {
        const guide = guidesById.get(product.idProduct);
        if (!guide) continue;
        const standard = saleAverage(guide.avg7);
        const foil = saleAverage(guide["avg7-foil"]);
        if (standard === null && foil === null) continue;
        (playableOffers[card.id] ??= []).push({ set, productId: product.idProduct, standard, foil, printingVerified: false });
      }
    }
  }
  const snapshot = { createdAt: guidesData.createdAt, quotes, playableOffers };
  cached = { until: Date.now() + 2 * 60 * 60 * 1000, snapshot };
  return snapshot;
}

