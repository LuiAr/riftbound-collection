"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CollectionSnapshot } from "../lib/collection-snapshot";
import type { GeneratedMarket } from "../lib/site-market";
import { versionsFor } from "../lib/local-decks";
import type { AdvisorContext } from "../lib/advisor-actions";

type StaticSite = {
  current: CollectionSnapshot;
  market: GeneratedMarket;
  advisorContext: () => AdvisorContext;
};

const StaticSiteContext = createContext<StaticSite | null>(null);

export function StaticProvider({ current, market, children }: { current: CollectionSnapshot; market: GeneratedMarket; children: ReactNode }) {
  const value = useMemo<StaticSite>(() => ({
    current,
    market,
    advisorContext: () => ({
      rows: current.rows,
      version: current.version,
      prices: market.prices,
      priceError: market.priceError,
      fx: market.fx,
      fxError: market.fxError,
      rulesCheckedAt: market.rulesCheckedAt,
      rulesError: market.rulesError,
      versionsFor,
    }),
  }), [current, market]);
  return <StaticSiteContext.Provider value={value}>{children}</StaticSiteContext.Provider>;
}

export function useStaticSite(): StaticSite {
  const value = useContext(StaticSiteContext);
  if (!value) throw new Error("Collection data is unavailable.");
  return value;
}
