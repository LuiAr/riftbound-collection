import { getChatGPTUser } from "../../chatgpt-auth";
import { catalog } from "../../../lib/collection";
import { priceKey, type PriceQuote, type PriceSnapshot } from "../../../lib/prices";

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

type Product = { idProduct: number; idExpansion: number; name: string };
type Guide = { idProduct: number; avg7?: number | null; "avg7-foil"?: number | null };
let cached: { until: number; snapshot: PriceSnapshot } | null = null;

const saleAverage = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

async function loadPrices(): Promise<PriceSnapshot> {
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
  const snapshot = { createdAt: guidesData.createdAt, quotes };
  cached = { until: Date.now() + 2 * 60 * 60 * 1000, snapshot };
  return snapshot;
}

export async function GET() {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in with ChatGPT to see prices." }, { status: 401 });
  try {
    const snapshot = await loadPrices();
    return Response.json(snapshot, { headers: { "cache-control": "private, max-age=3600" } });
  } catch (error) {
    console.error("Cardmarket prices could not be loaded", error);
    return Response.json({ error: "Recent prices are temporarily unavailable." }, { status: 503 });
  }
}
