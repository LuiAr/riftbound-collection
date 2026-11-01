import { RULES, type FxSnapshot } from "./deck-builder";

let fxCache: { until: number; value: FxSnapshot } | null = null;
let rulesCache: { until: number; checkedAt: string } | null = null;

export async function loadFx(options?: { allowStale?: boolean }): Promise<FxSnapshot> {
  if (fxCache && fxCache.until > Date.now()) return fxCache.value;
  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=SEK,USD", { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Exchange rates are unavailable.");
  const data = await response.json() as { date?: string; rates?: { SEK?: number; USD?: number } };
  const stale = !data.date || !Number.isFinite(Date.parse(data.date)) || Date.now() - Date.parse(data.date) > 7 * 86400000;
  if ((!options?.allowStale && stale) || !data.date || !data.rates?.SEK || !data.rates.USD || !Number.isFinite(data.rates.SEK) || !Number.isFinite(data.rates.USD) || data.rates.SEK <= 0 || data.rates.USD <= 0) throw new Error("Recent exchange rates are unavailable.");
  const value = { date: data.date, eurSek: data.rates.SEK, usdSek: data.rates.SEK / data.rates.USD };
  fxCache = { until: Date.now() + 3600000, value };
  return value;
}

export async function verifyCurrentRules(): Promise<string> {
  if (rulesCache && rulesCache.until > Date.now()) return rulesCache.checkedAt;
  const response = await fetch(RULES.source, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Current rules could not be verified. AI generation is paused.");
  const text = await response.text();
  const start = text.indexOf("Constructed Format Legality");
  const end = text.indexOf("2v2 Constructed Legality", start);
  const section = text.slice(start, end);
  if (start < 0 || end < 0 || !section.includes("September 18, 2026") || !text.includes(RULES.core.split("/").at(-1)!) || !text.includes(RULES.tournament.split("/").at(-1)!)) throw new Error("The official rules have changed or could not be checked. Generation needs a rules review.");
  const plain = section.replace(/<[^>]+>/g, " ").replace(/&(?:rsquo|#8217);/g, "'").replace(/’/g, "'");
  if (!RULES.bans.every((name) => plain.includes(name))) throw new Error("The current ban list could not be confirmed. Generation is paused.");
  const listedBans = [...section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1].replace(/<[^>]*>/g, "").replace(/&(?:rsquo|#8217);/g, "'").replace(/’/g, "'").trim()).filter(Boolean);
  if (listedBans.length !== RULES.bans.length || listedBans.some((name) => !RULES.bans.includes(name))) throw new Error("The official ban list has changed. Generation needs a rules review.");
  const checkedAt = new Date().toISOString();
  rulesCache = { until: Date.now() + 3600000, checkedAt };
  return checkedAt;
}
