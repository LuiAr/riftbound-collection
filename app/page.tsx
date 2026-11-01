import CollectionClient from "./collection-client";
import { StaticProvider } from "./static-context";
import collectionData from "../data/generated/collection.json";
import marketData from "../data/generated/market.json";
import type { CollectionSnapshot, GeneratedCollection } from "../lib/collection-snapshot";
import type { GeneratedMarket } from "../lib/site-market";

export default function Home() {
  const generated = collectionData as GeneratedCollection;
  const market = marketData as GeneratedMarket;
  const snapshots = Object.fromEntries(generated.snapshots.map((snapshot) => [snapshot.importId, snapshot as CollectionSnapshot]));
  const current = snapshots[generated.currentId];
  if (!current) throw new Error("The current collection snapshot is missing. Run npm run build again.");
  const history = [...generated.snapshots].sort((a, b) => b.version - a.version).flatMap((snapshot) => snapshot.importId && snapshot.sourceName ? [{ importId: snapshot.importId, version: snapshot.version, importedAt: snapshot.importedAt, sourceName: snapshot.sourceName }] : []);
  return <StaticProvider current={current} market={market}><CollectionClient initial={current} initialHistory={history} snapshots={snapshots} /></StaticProvider>;
}
