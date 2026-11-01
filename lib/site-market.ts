import type { FxSnapshot } from "./deck-builder";
import type { PriceSnapshot } from "./prices";

export type GeneratedMarket = {
  prices: PriceSnapshot | null;
  priceError: string | null;
  fx: FxSnapshot | null;
  fxError: string | null;
  rulesCheckedAt: string | null;
  rulesError: string | null;
};
